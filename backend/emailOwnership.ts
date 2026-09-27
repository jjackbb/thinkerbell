import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

type CheckToken = { id: string; email: string; expiresAt: number };
type Settings = { cipherKey: Buffer; digestKey: Buffer; resendKey: string; appUrl: URL };

function settings(): Settings | null {
  if (process.env.EMAIL_CHECK_ENABLED !== "true") return null;
  const raw = process.env.EMAIL_CHECK_SECRET || "";
  const master = Buffer.from(raw, "base64");
  const resendKey = process.env.RESEND_EMAIL_CHECK_API_KEY || "";
  let appUrl: URL;
  try { appUrl = new URL(process.env.APP_URL || "https://invalid.example"); }
  catch { return null; }
  if (master.length !== 32 || !resendKey ||
      (appUrl.protocol !== "https:" &&
        !(appUrl.protocol === "http:" && appUrl.hostname === "localhost")) ||
      appUrl.username || appUrl.password || appUrl.search || appUrl.hash ||
      appUrl.pathname !== "/" ||
      appUrl.hostname === "invalid.example") return null;
  return {
    cipherKey: Buffer.from(hkdfSync("sha256", master, "thinkerbell-email-check", "cipher-v1", 32)),
    digestKey: Buffer.from(hkdfSync("sha256", master, "thinkerbell-email-check", "digest-v1", 32)),
    resendKey, appUrl,
  };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function emailDigest(email: string, key: Buffer): string {
  return createHmac("sha256", key).update(email).digest("hex");
}

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createToken(payload: CheckToken, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function readToken(token: unknown, key: Buffer): CheckToken | null {
  if (typeof token !== "string" || token.length > 1024 ||
      !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length < 30) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([
      decipher.update(bytes.subarray(28)), decipher.final(),
    ]).toString("utf8")) as CheckToken;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(payload.id) ||
        typeof payload.email !== "string" || normalizeEmail(payload.email) !== payload.email ||
        !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function checkLink(base: URL, token: string): string {
  const url = new URL(base.origin + base.pathname);
  url.hash = new URLSearchParams({ email_check: token }).toString();
  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] || char);
}

export function registerEmailOwnershipRoutes(app: Express, client: () => SupabaseClient): void {
  app.post("/api/auth/email-check/request", async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const config = settings();
    if (!config) return void res.status(503).json({ error: "EMAIL_CHECK_UNAVAILABLE" });
    const email = normalizeEmail(req.body?.email);
    if (!email) return void res.status(400).json({ error: "INVALID_EMAIL" });

    const id = randomUUID();
    const token = createToken({ id, email, expiresAt: Date.now() + 10 * 60_000 }, config.cipherKey);
    try {
      const db = client();
      const { data: reserved, error: reserveError } = await db.rpc("reserve_signup_email_check", {
        p_id: id, p_email_digest: emailDigest(email, config.digestKey),
        p_token_digest: tokenDigest(token),
      });
      if (reserveError) throw reserveError;
      if (reserved !== true) return void res.status(429).json({ error: "EMAIL_CHECK_RATE_LIMITED" });

      const link = checkLink(config.appUrl, token);
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(8_000),
        headers: {
          Authorization: `Bearer ${config.resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `email-check/${id}`,
        },
        body: JSON.stringify({
          from: "니편내편 <accounts@auth.jjackbb.com>", to: [email],
          subject: "니편내편 이메일 소유 확인",
          text: `니편내편 가입 여부를 확인하려면 10분 안에 아래 링크를 열어 주세요.\n${link}\n요청하지 않았다면 무시해 주세요.`,
          html: `<p>니편내편 가입 여부를 확인하려면 10분 안에 아래 버튼을 눌러 주세요.</p><p><a href="${escapeHtml(link)}">내 이메일 확인하기</a></p><p>요청하지 않았다면 이 메일을 무시해 주세요.</p>`,
        }),
      });
      if (!sent.ok) {
        await db.from("signup_email_checks").delete().eq("id", id);
        return void res.status(503).json({ error: "EMAIL_CHECK_SEND_FAILED" });
      }
      return void res.status(202).json({ accepted: true });
    } catch {
      // A timeout can have sent the email already. Its one-use token remains
      // valid; never log the address, token, provider response, or DB body.
      return void res.status(503).json({ error: "EMAIL_CHECK_UNAVAILABLE" });
    }
  });

  app.post("/api/auth/email-check/verify", async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const config = settings();
    if (!config) return void res.status(503).json({ error: "EMAIL_CHECK_UNAVAILABLE" });
    const rawToken = req.body?.token;
    const payload = readToken(rawToken, config.cipherKey);
    if (!payload) return void res.status(410).json({ error: "EMAIL_CHECK_LINK_UNAVAILABLE" });
    try {
      const signupToken = randomBytes(32).toString("base64url");
      const { data: status, error } = await client().rpc("consume_signup_email_check", {
        p_id: payload.id,
        p_email_digest: emailDigest(payload.email, config.digestKey),
        p_token_digest: tokenDigest(rawToken), p_email: payload.email,
        p_signup_digest: tokenDigest(signupToken),
      });
      if (error?.message?.includes("EMAIL_CHECK_LINK_UNAVAILABLE")) {
        return void res.status(410).json({ error: "EMAIL_CHECK_LINK_UNAVAILABLE" });
      }
      if (error || !["registered", "pending", "available"].includes(status)) {
        throw error || new Error("INVALID_RESULT");
      }
      return void res.json({
        status, email: payload.email,
        ...(status === "available" ? { signupToken } : {}),
      });
    } catch {
      return void res.status(503).json({ error: "EMAIL_CHECK_UNAVAILABLE" });
    }
  });

  app.post("/api/auth/email-check/signup", async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const config = settings();
    if (!config) return void res.status(503).json({ error: "EMAIL_CHECK_UNAVAILABLE" });
    const email = normalizeEmail(req.body?.email);
    const signupToken = req.body?.signupToken;
    const password = req.body?.password;
    const nickname = typeof req.body?.nickname === "string" ? req.body.nickname.trim() : "";
    if (!email || typeof signupToken !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(signupToken) ||
        typeof password !== "string" || password.length < 6 || password.length > 1024 ||
        !nickname || nickname.length > 12) {
      return void res.status(400).json({ error: "INVALID_SIGNUP" });
    }
    try {
      const db = client();
      const { data: status, error: claimError } = await db.rpc("claim_signup_email_check", {
        p_email_digest: emailDigest(email, config.digestKey),
        p_signup_digest: tokenDigest(signupToken), p_email: email,
      });
      if (claimError?.message?.includes("EMAIL_CHECK_LINK_UNAVAILABLE")) {
        return void res.status(410).json({ error: "EMAIL_CHECK_LINK_UNAVAILABLE" });
      }
      if (claimError || !["available", "registered", "pending"].includes(status)) {
        throw claimError || new Error("INVALID_RESULT");
      }
      if (status !== "available") return void res.status(409).json({ status });

      // This server-only API creates an already confirmed account because the
      // mailbox bearer was verified above. It must never be exposed in VITE_*.
      const { data, error } = await db.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { nickname },
      });
      if (error) {
        if (["email_exists", "user_already_exists"].includes(error.code || "")) {
          return void res.status(409).json({ status: "registered" });
        }
        return void res.status(503).json({ error: "SIGNUP_UNAVAILABLE" });
      }
      if (!data.user) throw new Error("MISSING_CREATED_USER");
      return void res.status(201).json({ created: true });
    } catch {
      // An uncertain Admin API result is never retried with the same proof.
      // The visitor can try password login or request a new mailbox link.
      return void res.status(503).json({ error: "SIGNUP_UNAVAILABLE" });
    }
  });
}
