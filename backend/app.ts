import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildEmpathyPrompt, buildSimulationPrompt, EMPATHY_OPENERS, EMPATHY_PERSONA_NAMES, OPENING_SCRIPTS, ratioLabel } from "../frontend/src/lib/prompts";
import { consumePotensStream } from "./potensStream";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Random nickname helper
const ADJECTIVES = [
  "억울한", "속상한", "답답한", "사이다마신", "화가난", "분노의", "당황한", "어이없는",
  "서러운", "슬픈", "배신당한", "기막힌", "통쾌한", "멘붕온", "열받은", "당당한",
  "공감하는", "내편인", "속시원한", "평온한"
];

const NOUNS = [
  "고구마", "야옹이", "사막여우", "아기곰", "쿼카", "펭귄", "다람쥐", "너구리",
  "토끼", "강아지", "사자", "호랑이", "오리", "판다", "햄스터", "부엉이",
  "고래", "수달", "코알라", "사슴"
];

function generateRandomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 89);
  return `${adj}${noun}${num}`;
}

// Health check endpoint
const POTENS_MODEL = process.env.POTENS_MODEL || "claude-4-6-sonnet";

function aiQuotaMode(): "legacy" | "server" {
  const raw = process.env.AI_QUOTA_ACTIVATES_AT;
  if (!raw) return "legacy";
  const instant = new Date(raw);
  if (!Number.isFinite(instant.getTime()) ||
      new Date(instant.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11) !== "00:00:00.000Z") {
    throw new StoryRequestFailure(503, "AI_QUOTA_CONFIG_INVALID");
  }
  return Date.now() >= instant.getTime() ? "server" : "legacy";
}

function seoulQuotaDay(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

app.get("/api/ai/quota", async (req: Request, res: Response) => {
  try {
    const user = await authenticatedStoryUser(req);
    const mode = aiQuotaMode();
    const day = seoulQuotaDay();
    const client = storyWriteClient();
    const query = mode === "server"
      ? client.from("ai_quota_reservations").select("id")
          .eq("user_id", user.id).eq("quota_day", day)
          .in("status", ["reserved", "completed"])
      : client.from("ai_chat_usage").select("id")
          .eq("userId", user.id).eq("usedOn", day);
    const { data, error } = await query;
    if (error) throw new StoryRequestFailure(503, "AI_QUOTA_UNAVAILABLE");
    return res.json({ mode, quotaDay: day, used: data?.length ?? 0, limit: 3 });
  } catch (error) {
    return sendStorySaveError(res, error);
  }
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Random nickname endpoint
app.get("/api/nickname/random", (req: Request, res: Response) => {
  res.json({ nickname: generateRandomNickname() });
});

// AI Chat (non-streaming). Only the server-held Potens key may call the provider.
app.post("/api/chat", async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "INVALID_PROMPT" });
  let context: Awaited<ReturnType<typeof authorizedChatContext>>;
  try {
    const user = await authenticatedStoryUser(req);
    context = await authorizedChatContext(user.id, req.body?.personaId, prompt);
    if (aiQuotaMode() === "server") throw new StoryRequestFailure(503, "AI_QUOTA_NOT_READY");
  } catch (error) {
    return sendStorySaveError(res, error);
  }
  const apiKey = process.env.POTENS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "AI_PROVIDER_UNAVAILABLE" });

  const instruction = context.instruction;
  const fullPrompt = instruction
    ? `[System Instruction: ${instruction}]\n\n[User Input]: ${prompt}`
    : prompt;
  try {
    const response = await fetch("https://ai.potens.ai/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: fullPrompt, model: POTENS_MODEL }),
    });
    if (!response.ok) return res.status(502).json({ error: "AI_PROVIDER_FAILED" });
    const data: unknown = await response.json();
    const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const message = typeof result.message === "string" ? result.message : result.text;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(502).json({ error: "AI_PROVIDER_FAILED" });
    }
    return res.json({ message, token_usage: result.token_usage ?? null, source: "potens-ai" });
  } catch {
    return res.status(502).json({ error: "AI_PROVIDER_FAILED" });
  }
});

// AI Chat Streaming (SSE). Provider failure remains an error, never a mock answer.
app.post("/api/chat-stream", async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "INVALID_PROMPT" });
  let context: Awaited<ReturnType<typeof authorizedChatContext>>;
  try {
    const user = await authenticatedStoryUser(req);
    context = await authorizedChatContext(user.id, req.body?.personaId, prompt);
    if (aiQuotaMode() === "server") throw new StoryRequestFailure(503, "AI_QUOTA_NOT_READY");
  } catch (error) {
    return sendStorySaveError(res, error);
  }
  const apiKey = process.env.POTENS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "AI_PROVIDER_UNAVAILABLE" });

  const instruction = context.instruction;
  const history = context.history;
  const historyText = history.length > 0
    ? "\n\n[과거 대화 히스토리 (시나리오 흐름 참고용)]:\n" +
      history.map((entry: unknown) => {
        const message = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        const sender = message.sender === "user" ? "작성자(유저)" : "상대방(너)";
        const text = typeof message.text === "string" ? message.text : "";
        return `${sender}: ${text}`;
      }).join("\n")
    : "";
  const compiledPrompt = `${instruction ? `[System Instruction: ${instruction}]\n` : ""}${historyText}\n\n[작성자(유저)의 이번 최신 발언]: "${prompt}"\n[상대방(너)의 실제 대사 및 응답]:`;

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const controller = new AbortController();
  res.on("close", () => { if (!res.writableEnded) controller.abort(); });
  try {
    const response = await fetch("https://ai.potens.ai/api/chat-stream", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: compiledPrompt, model: POTENS_MODEL }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      console.warn("Potens stream failed with status:", response.status);
      res.write(`data: ${JSON.stringify({ type: "error", error: "ai_provider_failed" })}\n\n`);
      return res.end();
    }
    await consumePotensStream(response.body, (chunk) => {
      if (!res.destroyed) res.write(`data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`);
    });
    if (!res.destroyed) res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    return res.end();
  } catch {
    if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "ai_provider_failed" })}\n\n`);
      return res.end();
    }
    return;
  }
});

type StoryCheckResult = {
  isAdult: boolean;
  hasProfanity: boolean;
  sanitizedTitle: string;
  sanitizedText: string;
};

class StoryRequestFailure extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

// 사연 저장 API는 이 판정에 성공해야만 DB에 쓸 수 있다.
async function checkStoryContent(title: string, body: string): Promise<StoryCheckResult> {
    if (!process.env.POTENS_API_KEY) throw new StoryRequestFailure(503, "CONTENT_CHECK_UNAVAILABLE");
    const titlePart = title ? `제목: "${title.replace(/"/g, '\\"')}"\n` : '';
    const prompt = `다음 텍스트를 검사하여 아래 JSON 포맷으로만 응답해라. 부가 설명이나 마크다운 코드블럭(백틱)은 절대 붙이지 마라.

1. isAdult: 성적인 내용, 지나친 잔혹성 등 19금 성인 콘텐츠 포함 여부 (true/false)
2. hasProfanity: 심한 욕설, 비하 발언, 비속어 포함 여부 (true/false)
3. sanitizedTitle: 제목에 비속어가 있다면 해당 단어만 '***'로 치환. 비속어가 없거나 제목이 없으면 원문 그대로 출력.
4. sanitizedText: 본문에 비속어나 심한 욕설이 있다면 해당 단어만 '***'로 치환. 비속어가 없으면 원문 그대로 출력.
5. issueMySide: 이 사연에서 '작성자 편'을 들 만한 근거를 한 문장(40자 이내)으로. 작성자를 주어로 쓰지 말고 상황 중심으로.
6. issueYourSide: 반대로 '상대방 편'을 들 만한 근거를 한 문장(40자 이내)으로. 반드시 5번과 대칭이 되게, 억지스럽더라도 상대 입장에서 가능한 해석을 쓴다.

${titlePart}본문: "${body.replace(/"/g, '\\"')}"

응답 포맷(이 형식만 출력):
{"isAdult": false, "hasProfanity": true, "sanitizedTitle": "제목 예시", "sanitizedText": "본문 *** 예시", "issueMySide": "약속을 일방적으로 어긴 쪽은 상대다", "issueYourSide": "미리 사정을 설명할 기회가 없었을 수 있다"}`;

    let response: globalThis.Response;
    try {
      response = await fetch("https://ai.potens.ai/api/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.POTENS_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt, model: "claude-4-6-sonnet", temperature: 0.1 })
      });
    } catch {
      throw new StoryRequestFailure(502, "CONTENT_CHECK_FAILED");
    }
    if (!response.ok) {
      console.warn("Potens content check failed with status:", response.status);
      throw new StoryRequestFailure(502, "CONTENT_CHECK_FAILED");
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new StoryRequestFailure(502, "CONTENT_CHECK_FAILED");
    }
    const rawText = typeof data.message === "string" ? data.message : data.text;
    if (typeof rawText !== "string") {
      throw new StoryRequestFailure(502, "CONTENT_CHECK_FAILED");
    }
    let result: StoryCheckResult;
    try {
      result = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      throw new StoryRequestFailure(502, "CONTENT_CHECK_FAILED");
    }
    if (!result || typeof result.isAdult !== "boolean" || typeof result.hasProfanity !== "boolean" ||
        typeof result.sanitizedTitle !== "string" || typeof result.sanitizedText !== "string" ||
        !result.sanitizedTitle.trim() || result.sanitizedTitle.length > 30 ||
        result.sanitizedText.trim().length < 20 || result.sanitizedText.length > 1000) {
      throw new StoryRequestFailure(502, "CONTENT_CHECK_FAILED");
    }
    return result;
}

const STORY_CATEGORIES = new Set(["연애", "직장", "친구", "가족", "기타"]);
const STORY_CARD_COLORS = ["pink", "teal", "lavender", "peach", "ochre"];

function readStoryInput(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const category = input.category;
  const opponentPersonality = typeof input.opponentPersonality === "string" ? input.opponentPersonality.trim() : "";
  if (!title || title.length > 30 || body.length < 20 || body.length > 1000 ||
      typeof category !== "string" || !STORY_CATEGORIES.has(category) || opponentPersonality.length > 100) {
    throw new StoryRequestFailure(400, "INVALID_STORY_CONTENT");
  }
  return { title, body, category, opponentPersonality };
}

function readStoryRequestId(value: unknown): string {
  if (typeof value !== "string" ||
      !/^story-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new StoryRequestFailure(400, "INVALID_STORY_REQUEST_ID");
  }
  return value;
}

type AiRoomInput = {
  id: string;
  storyId: string;
  mode: "simulation" | "explanation";
  opening: "apology" | "oblivious" | "meFirst" | null;
  ratio: "High" | "Middle" | "Low" | null;
};

function readAiRoomInput(value: unknown): AiRoomInput {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const requestId = input.requestId;
  const storyId = input.storyId;
  const mode = input.mode;
  if (typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId) ||
      typeof storyId !== "string" || !storyId || storyId.length > 120 ||
      (mode !== "simulation" && mode !== "explanation")) {
    throw new StoryRequestFailure(400, "INVALID_CHAT_ROOM_REQUEST");
  }
  if (mode === "simulation") {
    const opening = input.opening ?? "oblivious";
    if (opening !== "apology" && opening !== "oblivious" && opening !== "meFirst") {
      throw new StoryRequestFailure(400, "INVALID_CHAT_ROOM_REQUEST");
    }
    return { id: `persona-${requestId}`, storyId, mode, opening, ratio: null };
  }
  const ratio = input.ratio;
  if (ratio !== "High" && ratio !== "Middle" && ratio !== "Low") {
    throw new StoryRequestFailure(400, "INVALID_CHAT_ROOM_REQUEST");
  }
  return { id: `persona-${requestId}`, storyId, mode, opening: null, ratio };
}

function sameAiRoomChoice(row: Record<string, any>, input: AiRoomInput, userId: string) {
  return row.userId === userId && row.storyId === input.storyId &&
    row.opening === input.opening && row.ratio === input.ratio;
}

app.post("/api/ai/rooms", async (req: Request, res: Response) => {
  try {
    const user = await authenticatedStoryUser(req);
    const input = readAiRoomInput(req.body);
    // 설정 오류를 저장 후에 발견하면 방은 생성되고 화면에는 실패로 보인다.
    const quotaMode = aiQuotaMode();
    const client = storyWriteClient();
    const { data: prior, error: priorError } = await client.from("ai_personas")
      .select("*").eq("id", input.id).maybeSingle();
    if (priorError) throw new StoryRequestFailure(500, "CHAT_ROOM_SAVE_FAILED");
    if (prior) {
      if (!sameAiRoomChoice(prior, input, user.id)) {
        throw new StoryRequestFailure(409, "CHAT_ROOM_REQUEST_CONFLICT");
      }
      return res.json({ room: prior, recovered: true, quotaMode });
    }

    const choice = input.mode === "simulation" ? "opening" : "ratio";
    const choiceValue = input.mode === "simulation" ? input.opening : input.ratio;
    const { data: matching, error: matchError } = await client.from("ai_personas")
      .select("*").eq("userId", user.id).eq("storyId", input.storyId)
      .eq(choice, choiceValue).maybeSingle();
    if (matchError) throw new StoryRequestFailure(500, "CHAT_ROOM_SAVE_FAILED");
    if (matching) return res.json({ room: matching, recovered: true, quotaMode });

    const { data: story, error: storyError } = await client.from("stories")
      .select("*").eq("id", input.storyId).maybeSingle();
    if (storyError) throw new StoryRequestFailure(500, "CHAT_ROOM_SAVE_FAILED");
    if (!story || story.isBlind || story.isAdult || story.isHidden ||
        (story.visibility && story.visibility !== "public" && story.authorId !== user.id)) {
      throw new StoryRequestFailure(404, "STORY_NOT_FOUND");
    }
    const { data: hidden, error: hiddenError } = await client.from("story_hides")
      .select("story_id").eq("user_id", user.id).eq("story_id", input.storyId).maybeSingle();
    if (hiddenError) throw new StoryRequestFailure(500, "CHAT_ROOM_SAVE_FAILED");
    if (hidden) throw new StoryRequestFailure(404, "STORY_NOT_FOUND");

    const category = typeof story.category === "string" ? story.category : "기타";
    const title = typeof story.title === "string" ? story.title : "";
    const storyBody = typeof story.body === "string" ? story.body : "";
    const opponentPersonality = typeof story.personaInstruction === "string" ? story.personaInstruction : "";
    const opening = input.opening ?? "oblivious";
    const ratio = input.ratio ?? "Middle";
    const simulation = input.mode === "simulation";
    const row = {
      id: input.id,
      userId: user.id,
      name: simulation ? ({ "연애": "연인", "직장": "직장 상대", "친구": "친구", "가족": "가족" } as Record<string, string>)[category] ?? "상대방" : EMPATHY_PERSONA_NAMES[ratio],
      role: simulation ? "상황" : ratioLabel(ratio),
      category,
      avatarIcon: simulation ? "Bot" : "ListTree",
      description: `사연: "${title}" 의 ${simulation ? "상대방 AI 페르소나" : "공감 대화 상대"}입니다.`,
      systemInstruction: simulation
        ? buildSimulationPrompt({ storyBody, opponentPersonality, opening })
        : buildEmpathyPrompt({ storyBody, opponentPersonality, ratio }),
      cardColor: simulation ? "pink" : "teal",
      sampleFirstMessage: simulation ? OPENING_SCRIPTS[opening].first ?? "" : EMPATHY_OPENERS[ratio],
      isPinned: false,
      chatHistory: [],
      storyId: input.storyId,
      opening: input.opening,
      ratio: input.ratio,
    };
    const { data: saved, error: saveError } = await client.from("ai_personas")
      .insert(row).select("*").single();
    if (saveError?.code === "23505") {
      const retry = await client.from("ai_personas").select("*").eq("id", input.id).maybeSingle();
      if (!retry.error && retry.data && sameAiRoomChoice(retry.data, input, user.id)) {
        return res.json({ room: retry.data, recovered: true, quotaMode });
      }
      const sameChoice = await client.from("ai_personas").select("*")
        .eq("userId", user.id).eq("storyId", input.storyId)
        .eq(choice, choiceValue).maybeSingle();
      if (!sameChoice.error && sameChoice.data && sameAiRoomChoice(sameChoice.data, input, user.id)) {
        return res.json({ room: sameChoice.data, recovered: true, quotaMode });
      }
    }
    if (saveError || !saved) throw new StoryRequestFailure(500, "CHAT_ROOM_SAVE_FAILED");
    return res.status(201).json({ room: saved, recovered: false, quotaMode });
  } catch (error) {
    return sendStorySaveError(res, error);
  }
});

function storySupabaseUrl() {
  const serverUrl = process.env.SUPABASE_URL;
  const browserUrl = process.env.VITE_SUPABASE_URL;
  if (serverUrl && browserUrl && serverUrl !== browserUrl) {
    throw new StoryRequestFailure(503, "STORY_STORAGE_UNAVAILABLE");
  }
  const url = serverUrl || browserUrl;
  if (!url) throw new StoryRequestFailure(503, "STORY_STORAGE_UNAVAILABLE");
  return url;
}

async function authenticatedStoryUser(req: Request) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  if (!token) throw new StoryRequestFailure(401, "AUTH_REQUIRED");
  const url = storySupabaseUrl();
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new StoryRequestFailure(503, "STORY_STORAGE_UNAVAILABLE");

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new StoryRequestFailure(401, "AUTH_REQUIRED");
  return user;
}

function storyWriteClient() {
  const url = storySupabaseUrl();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new StoryRequestFailure(503, "STORY_STORAGE_UNAVAILABLE");

  // 사용자 토큰을 이 클라이언트에 붙이면 RLS 우회 권한이 사라질 수 있다.
  // 반드시 인증·소유권 확인을 마친 사연 저장 요청에서만 사용한다.
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authorizedChatContext(userId: string, personaIdValue: unknown, prompt: string) {
  const personaId = typeof personaIdValue === "string" ? personaIdValue : "";
  if (!personaId || personaId.length > 100) {
    throw new StoryRequestFailure(400, "INVALID_CHAT_ROOM");
  }
  const { data, error } = await storyWriteClient().from("ai_personas")
    .select("id,userId,systemInstruction,chatHistory")
    .eq("id", personaId).maybeSingle();
  if (error) throw new StoryRequestFailure(500, "CHAT_ROOM_LOOKUP_FAILED");
  if (!data || data.userId !== userId) {
    // Do not reveal whether another account owns this room.
    throw new StoryRequestFailure(404, "CHAT_ROOM_NOT_FOUND");
  }
  const history = Array.isArray(data.chatHistory)
    ? data.chatHistory.filter((entry: unknown) => {
        if (!entry || typeof entry !== "object") return false;
        const message = entry as Record<string, unknown>;
        return (message.sender === "user" || message.sender === "ai") &&
          typeof message.text === "string" && message.text.length <= 4000;
      }).slice(-9)
    : [];
  // The UI may save the just-typed user message before this request reaches us.
  // It belongs in the prompt once, not again in the historical context.
  const last = history.at(-1) as Record<string, unknown> | undefined;
  if (last?.sender === "user" && typeof last.text === "string" && last.text.trim() === prompt) {
    history.pop();
  }
  return {
    instruction: typeof data.systemInstruction === "string" ? data.systemInstruction : "",
    history: history.slice(-8),
  };
}

function sendStorySaveError(res: Response, error: unknown): Response {
  if (error instanceof StoryRequestFailure) {
    return res.status(error.status).json({ error: error.code });
  }
  console.error("Story save request failed:", error instanceof Error ? error.name : "unknown");
  return res.status(500).json({ error: "STORY_SAVE_FAILED" });
}

async function sanitizeCommentText(value: unknown): Promise<string> {
  const content = typeof value === "string" ? value.trim() : "";
  if (!content || content.length > 200) {
    throw new StoryRequestFailure(400, "INVALID_COMMENT_CONTENT");
  }
  const apiKey = process.env.POTENS_API_KEY;
  if (!apiKey) throw new StoryRequestFailure(503, "COMMENT_CHECK_UNAVAILABLE");
  const prompt = `다음 텍스트에 비속어나 심한 욕설이 포함되어 있다면 해당 단어만 '***'로 치환한 텍스트를 반환해라. 비속어가 없으면 원문 그대로 출력해라. 부가 설명 없이 치환된 텍스트만 출력해라.\n\n텍스트: "${content.replace(/"/g, '\\"')}"`;
  let response: globalThis.Response;
  try {
    response = await fetch("https://ai.potens.ai/api/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: POTENS_MODEL, temperature: 0.1 }),
    });
  } catch {
    throw new StoryRequestFailure(502, "COMMENT_CHECK_FAILED");
  }
  if (!response.ok) throw new StoryRequestFailure(502, "COMMENT_CHECK_FAILED");
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new StoryRequestFailure(502, "COMMENT_CHECK_FAILED");
  }
  const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const rawText = typeof result.message === "string" ? result.message : result.text;
  const sanitized = typeof rawText === "string" ? rawText.trim().replace(/^["']|["']$/g, "") : "";
  if (!sanitized || sanitized.length > 200) {
    throw new StoryRequestFailure(502, "COMMENT_CHECK_FAILED");
  }
  return sanitized;
}

function readCommentTarget(body: unknown): { id: string; storyId: string } {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const id = typeof input.id === "string" ? input.id : "";
  const storyId = typeof input.storyId === "string" ? input.storyId : "";
  if (!/^comment-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !storyId || storyId.length > 100) {
    throw new StoryRequestFailure(400, "INVALID_COMMENT_TARGET");
  }
  return { id, storyId };
}

async function requireCommentableStory(client: ReturnType<typeof storyWriteClient>, storyId: string) {
  const { data, error } = await client.from("stories")
    .select("*").eq("id", storyId).maybeSingle();
  if (error) throw new StoryRequestFailure(500, "COMMENT_SAVE_FAILED");
  // `visibility` is only present after the private-story migration. Older DB
  // rows have no private state; once the column exists, only public is writable.
  if (!data || data.isBlind || data.isAdult || data.isHidden ||
      ("visibility" in data && data.visibility !== "public")) {
    throw new StoryRequestFailure(404, "STORY_NOT_FOUND");
  }
}

// 브라우저의 검사 결과를 신뢰하지 않고 인증·검사·DB 저장을 한 요청에서 처리한다.
app.post("/api/stories", async (req: Request, res: Response) => {
  try {
    const user = await authenticatedStoryUser(req);
    const client = storyWriteClient();
    const requestId = readStoryRequestId(req.body?.requestId);
    const { data: prior, error: priorError } = await client.from("stories")
      .select("*").eq("id", requestId).maybeSingle();
    if (priorError) throw new StoryRequestFailure(500, "STORY_SAVE_FAILED");
    if (prior) {
      if (prior.authorId !== user.id) throw new StoryRequestFailure(409, "STORY_REQUEST_CONFLICT");
      return res.json({ story: prior, recovered: true });
    }
    const input = readStoryInput(req.body);
    const checked = await checkStoryContent(input.title, input.body);
    if (checked.isAdult) throw new StoryRequestFailure(422, "ADULT_CONTENT_BLOCKED");

    const nickname = typeof user.user_metadata?.nickname === "string"
      ? user.user_metadata.nickname.trim().slice(0, 12) : "";
    const row = {
      id: requestId,
      authorId: user.id,
      authorNickname: nickname || "익명",
      title: checked.sanitizedTitle.trim(),
      body: checked.sanitizedText.trim(),
      category: input.category,
      createdAt: new Date().toISOString(),
      votesA: 0,
      votesB: 0,
      commentCount: 0,
      viewCount: 0,
      reportsCount: 0,
      isBlind: false,
      isAdult: false,
      personaInstruction: input.opponentPersonality || null,
      cardColor: STORY_CARD_COLORS[Math.floor(Math.random() * STORY_CARD_COLORS.length)],
    };
    const { data, error } = await client.from("stories").insert(row).select("*").single();
    if (error?.code === "23505") {
      // 같은 요청이 동시에 들어오면 한 건만 저장하고 나머지는 그 결과를 돌려준다.
      const retry = await client.from("stories").select("*").eq("id", requestId).maybeSingle();
      if (!retry.error && retry.data?.authorId === user.id) {
        return res.json({ story: retry.data, recovered: true });
      }
      throw new StoryRequestFailure(409, "STORY_REQUEST_CONFLICT");
    }
    if (error || !data) {
      console.error("Story insert failed:", error?.code ?? "NO_INSERTED_ROW");
      throw new StoryRequestFailure(500, "STORY_SAVE_FAILED");
    }
    return res.status(201).json({ story: data, recovered: false });
  } catch (error) {
    return sendStorySaveError(res, error);
  }
});

app.put("/api/stories/:id", async (req: Request, res: Response) => {
  try {
    const user = await authenticatedStoryUser(req);
    const client = storyWriteClient();
    const input = readStoryInput(req.body);
    const { data: existing, error: lookupError } = await client.from("stories")
      .select("authorId").eq("id", req.params.id).maybeSingle();
    if (lookupError) {
      console.error("Story ownership lookup failed:", lookupError.code);
      throw new StoryRequestFailure(500, "STORY_SAVE_FAILED");
    }
    // 존재 여부와 타인 소유 여부를 같은 응답으로 처리한다.
    if (!existing || existing.authorId !== user.id) throw new StoryRequestFailure(404, "STORY_NOT_FOUND");
    const checked = await checkStoryContent(input.title, input.body);
    if (checked.isAdult) throw new StoryRequestFailure(422, "ADULT_CONTENT_BLOCKED");

    const { data, error } = await client.from("stories").update({
      title: checked.sanitizedTitle.trim(),
      body: checked.sanitizedText.trim(),
      category: input.category,
      personaInstruction: input.opponentPersonality || null,
      isAdult: false,
    }).eq("id", req.params.id).eq("authorId", user.id).select("*").maybeSingle();
    if (error) {
      console.error("Story update failed:", error.code);
      throw new StoryRequestFailure(500, "STORY_SAVE_FAILED");
    }
    if (!data) throw new StoryRequestFailure(404, "STORY_NOT_FOUND");
    return res.json({ story: data });
  } catch (error) {
    return sendStorySaveError(res, error);
  }
});

// 댓글은 검사를 통과한 본문과 저장 결과를 한 서버 경로에서 확정한다.
app.post("/api/comments", async (req: Request, res: Response) => {
  try {
    const user = await authenticatedStoryUser(req);
    const client = storyWriteClient();
    const { id, storyId } = readCommentTarget(req.body);
    await requireCommentableStory(client, storyId);

    const { data: existing, error: lookupError } = await client.from("comments")
      .select("*").eq("id", id).maybeSingle();
    if (lookupError) throw new StoryRequestFailure(500, "COMMENT_SAVE_FAILED");
    if (existing) {
      if (existing.authorId !== user.id || existing.storyId !== storyId) {
        throw new StoryRequestFailure(409, "COMMENT_ID_CONFLICT");
      }
      return res.json({ comment: existing });
    }

    const content = await sanitizeCommentText(req.body?.content);
    const { data, error } = await client.from("comments").insert({
      id, storyId, authorId: user.id, anonymousId: "익명 0", content,
      createdAt: new Date().toISOString(), likeCount: 0, reportsCount: 0,
      isBlind: false, isEdited: false,
    }).select("*").single();
    if (error?.code === "23505") {
      const retry = await client.from("comments").select("*").eq("id", id).maybeSingle();
      if (!retry.error && retry.data?.authorId === user.id && retry.data?.storyId === storyId) {
        return res.json({ comment: retry.data });
      }
    }
    if (error || !data) throw new StoryRequestFailure(500, "COMMENT_SAVE_FAILED");
    return res.status(201).json({ comment: data });
  } catch (error) {
    return sendStorySaveError(res, error);
  }
});

app.put("/api/comments/:id", async (req: Request, res: Response) => {
  try {
    const user = await authenticatedStoryUser(req);
    const id = req.params.id;
    const storyId = typeof req.body?.storyId === "string" ? req.body.storyId : "";
    if (!id || id.length > 100 || !storyId || storyId.length > 100) {
      throw new StoryRequestFailure(400, "INVALID_COMMENT_TARGET");
    }
    const client = storyWriteClient();
    await requireCommentableStory(client, storyId);
    const { data: existing, error: lookupError } = await client.from("comments")
      .select("id,authorId,storyId").eq("id", id).maybeSingle();
    if (lookupError) throw new StoryRequestFailure(500, "COMMENT_SAVE_FAILED");
    if (!existing || existing.authorId !== user.id || existing.storyId !== storyId) {
      throw new StoryRequestFailure(404, "COMMENT_NOT_FOUND");
    }
    const content = await sanitizeCommentText(req.body?.content);
    const { data, error } = await client.from("comments")
      .update({ content, isEdited: true })
      .eq("id", id).eq("authorId", user.id).eq("storyId", storyId)
      .select("*").maybeSingle();
    if (error || !data) throw new StoryRequestFailure(500, "COMMENT_SAVE_FAILED");
    return res.json({ comment: data });
  } catch (error) {
    return sendStorySaveError(res, error);
  }
});

// 댓글 입력 검사는 로그인한 이용자만 요청할 수 있다.
app.post("/api/sanitize-text", async (req: Request, res: Response) => {
  try {
    await authenticatedStoryUser(req);
    return res.json({ sanitizedText: await sanitizeCommentText(req.body?.text) });
  } catch (error) {
    return sendStorySaveError(res, error);
  }
});


export default app;
