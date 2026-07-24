import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Random nickname endpoint
app.get("/api/nickname/random", (req: Request, res: Response) => {
  res.json({ nickname: generateRandomNickname() });
});

// AI Chat (non-streaming)
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { prompt, model = "claude-4-6-sonnet", apiKey, persona, systemInstruction } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const effectiveApiKey = apiKey || process.env.POTENS_API_KEY;

    // Try Potens API if key exists
    if (effectiveApiKey) {
      try {
        const fullPrompt = systemInstruction 
          ? `[System Instruction: ${systemInstruction}]\n\n[User Input]: ${prompt}`
          : prompt;

        const response = await fetch("https://ai.potens.ai/api/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${effectiveApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            model: model || "claude-4-6-sonnet"
          })
        });

        if (response.ok) {
          const data = await response.json();
          return res.json({
            message: data.message || data.text || "",
            token_usage: data.token_usage || null,
            source: "potens-ai"
          });
        } else {
          console.warn("Potens API response error status:", response.status, await response.text());
        }
      } catch (potensErr) {
        console.warn("Potens API fetch failed, trying fallback:", potensErr);
      }
    }

    // Fallback to Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const fullPrompt = `${systemInstruction ? systemInstruction + "\n\n" : ""}${prompt}`;
      const geminiRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt
      });

      return res.json({
        message: geminiRes.text || "응답을 생성하지 못했습니다.",
        source: "gemini-fallback"
      });
    }

    // Simulation response if no API keys present
    return res.json({
      message: `[AI 시뮬레이션 모드 - ${persona || '상대방'}] 너 진짜 말 다 했어? 내 입장도 좀 들어봐. 나도 당시엔 어쩔 수 없는 상황이었단 말이야! (API 키가 설정되면 실제 LLM 응답으로 연동됩니다.)`,
      source: "simulation"
    });

  } catch (error: any) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// AI Chat Streaming (SSE)
app.post("/api/chat-stream", async (req: Request, res: Response) => {
  try {
    const { prompt, model = "claude-4-6-sonnet", apiKey, persona, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const effectiveApiKey = apiKey || process.env.POTENS_API_KEY;

    if (effectiveApiKey) {
      try {
        const fullPrompt = systemInstruction 
          ? `[System Instruction: ${systemInstruction}]\n\n[User Input]: ${prompt}`
          : prompt;

        const response = await fetch("https://ai.potens.ai/api/chat-stream", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${effectiveApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            model: model || "claude-4-6-sonnet"
          })
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
          return res.end();
        } else {
          console.warn("Potens Stream response error:", response.status);
        }
      } catch (streamErr) {
        console.warn("Potens Stream error, switching to fallback:", streamErr);
      }
    }

    // Gemini Fallback Streaming or Direct Stream
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const fullPrompt = `${systemInstruction ? systemInstruction + "\n\n" : ""}${prompt}`;
      
      const resultStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: fullPrompt
      });

      for await (const chunk of resultStream) {
        const text = chunk.text || "";
        res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: "done", token_usage: { prompt_tokens: 0, completion_tokens: 0 } })}\n\n`);
      return res.end();
    }

    // Mock Streaming Fallback
    const mockMsg = `[AI ${persona || '상대방'}] 너 정말 너무하다... 그게 무슨 소리야? 내가 그렇게 일방적으로 잘못했다고 생각하는 거야? 내 입장에서도 변명할 기회는 줘야지!`;
    const tokens = mockMsg.split("");

    for (let i = 0; i < tokens.length; i++) {
      res.write(`data: ${JSON.stringify({ type: "text", text: tokens[i] })}\n\n`);
      await new Promise(r => setTimeout(r, 20));
    }

    res.write(`data: ${JSON.stringify({ type: "done", token_usage: { prompt_tokens: 15, completion_tokens: 30 } })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error("Stream endpoint error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
      res.end();
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[니편내편 Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
