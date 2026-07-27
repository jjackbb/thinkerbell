import express, { Request, Response } from "express";
import path from "path";
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

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

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

// AI Adult Content & Profanity Checking (사연 제목 + 본문)
app.post("/api/check-adult-content", async (req: Request, res: Response) => {
  try {
    const { title, body, apiKey } = req.body;
    if (!body) return res.status(400).json({ error: "Story body is required" });

    const effectiveApiKey = apiKey || process.env.POTENS_API_KEY;
    const titlePart = title ? `제목: "${title.replace(/"/g, '\\"')}"\n` : '';
    const prompt = `다음 텍스트를 검사하여 아래 JSON 포맷으로만 응답해라. 부가 설명이나 마크다운 코드블럭(백틱)은 절대 붙이지 마라.

1. isAdult: 성적인 내용, 지나친 잔혹성 등 19금 성인 콘텐츠 포함 여부 (true/false)
2. hasProfanity: 심한 욕설, 비하 발언, 비속어 포함 여부 (true/false)
3. sanitizedTitle: 제목에 비속어가 있다면 해당 단어만 '***'로 치환. 비속어가 없거나 제목이 없으면 원문 그대로 출력.
4. sanitizedText: 본문에 비속어나 심한 욕설이 있다면 해당 단어만 '***'로 치환. 비속어가 없으면 원문 그대로 출력.

${titlePart}본문: "${body.replace(/"/g, '\\"')}"

응답 포맷(이 형식만 출력):
{"isAdult": false, "hasProfanity": true, "sanitizedTitle": "제목 예시", "sanitizedText": "본문 *** 예시"}`;

    let result: any = { isAdult: false, hasProfanity: false, sanitizedTitle: title || '', sanitizedText: body };

    if (effectiveApiKey) {
      try {
        const response = await fetch("https://ai.potens.ai/api/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${effectiveApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt,
            model: "claude-4-6-sonnet",
            temperature: 0.1
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = (data.message || data.text || "").trim();
          try {
            result = JSON.parse(rawText.replace(/```json|```/g, "").trim());
          } catch (parseErr) {
            console.warn("Potens JSON parse failed, raw:", rawText);
            const lower = rawText.toLowerCase();
            result.isAdult = lower.includes("true");
          }
        }
      } catch (e) {
        console.warn("Potens API check failed, fallback to Gemini:", e);
      }
    }

    // Gemini 폴백: Potens 결과가 기본값 그대로이고 Gemini 키가 있을 때
    if (result.sanitizedText === body && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const geminiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        const geminiRaw = (geminiRes.text || "").trim();
        try {
          result = JSON.parse(geminiRaw.replace(/```json|```/g, "").trim());
        } catch (parseErr) {
          console.warn("Gemini JSON parse failed, raw:", geminiRaw);
          const lower = geminiRaw.toLowerCase();
          result.isAdult = lower.includes("true");
        }
      } catch (geminiErr) {
        console.warn("Gemini fallback failed:", geminiErr);
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error("Check adult content error:", error);
    res.json({ isAdult: false, hasProfanity: false, sanitizedTitle: req.body?.title || '', sanitizedText: req.body?.body || "" });
  }
});

// 댓글 전용 비속어 필터 (경량 API)
app.post("/api/sanitize-text", async (req: Request, res: Response) => {
  try {
    const { text, apiKey } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const effectiveApiKey = apiKey || process.env.POTENS_API_KEY;
    const prompt = `다음 텍스트에 비속어나 심한 욕설이 포함되어 있다면 해당 단어만 '***'로 치환한 텍스트를 반환해라. 비속어가 없으면 원문 그대로 출력해라. 부가 설명 없이 치환된 텍스트만 출력해라.

텍스트: "${text.replace(/"/g, '\\"')}"`;

    let sanitized = text;

    if (effectiveApiKey) {
      try {
        const response = await fetch("https://ai.potens.ai/api/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${effectiveApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt,
            model: "claude-4-6-sonnet",
            temperature: 0.1
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = (data.message || data.text || "").trim();
          if (rawText) sanitized = rawText;
        }
      } catch (e) {
        console.warn("Potens sanitize failed, fallback to Gemini:", e);
      }
    }

    // Gemini 폴백
    if (sanitized === text && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const geminiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });
        const geminiRaw = (geminiRes.text || "").trim();
        if (geminiRaw) sanitized = geminiRaw;
      } catch (geminiErr) {
        console.warn("Gemini sanitize fallback failed:", geminiErr);
      }
    }

    res.json({ sanitizedText: sanitized });
  } catch (error: any) {
    console.error("Sanitize text error:", error);
    res.json({ sanitizedText: req.body?.text || "" });
  }
});


export default app;

