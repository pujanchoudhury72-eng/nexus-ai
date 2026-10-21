"use strict";

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
.split(",")
.map(origin => origin.trim());

app.use((req, res, next) => {
const origin = req.headers.origin;

if (
ALLOWED_ORIGINS.includes("") ||
(origin && ALLOWED_ORIGINS.includes(origin))
) {
res.setHeader(
"Access-Control-Allow-Origin",
ALLOWED_ORIGINS.includes("") ? "*" : origin
);
}

res.setHeader("Vary", "Origin");
res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
return res.sendStatus(204);
}

next();
});

app.use(express.json({ limit: "30kb" }));

app.get("/", (req, res) => {
res.json({
name: "Nexus AI",
status: "online",
message: "Nexus AI backend is running."
});
});

app.get("/health", (req, res) => {
res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
try {
const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  return res.status(500).json({
    error: "GROQ_API_KEY missing. Add it in Render Environment."
  });
}

const body = req.body || {};
const messages = body.messages;
const tool = body.tool || "chat";

const instructions = {
  chat: "You are Nexus AI, a helpful AI assistant. Answer clearly.",
  builder:
    "You are Nexus AI App Builder. Help create applications. " +
    "Provide a file structure and complete code when asked. " +
    "Never claim files were created unless they actually were.",
  coding:
    "You are Nexus AI Coding Assistant. Help write, explain, " +
    "debug and improve code. Name the file for each code block.",
  image:
    "Help create detailed image-generation prompts. " +
    "This endpoint returns text only; it does not generate images.",
  video:
    "Help write video scripts, storyboards and prompts. " +
    "This endpoint does not render videos.",
  music:
    "Help write lyrics and music-generation prompts. " +
    "This endpoint does not generate audio.",
  projects:
    "Help plan and document software projects. " +
    "Do not claim to access external files without an integration."
};

if (!instructions[tool]) {
  return res.status(400).json({ error: "Unknown tool." });
}

if (!Array.isArray(messages) || messages.length === 0) {
  return res.status(400).json({
    error: "Please send a message."
  });
}

if (messages.length > 30) {
  return res.status(400).json({
    error: "Too many messages. Start a new conversation."
  });
}

const cleanMessages = [];

for (const message of messages) {
  if (
    !message ||
    !["user", "assistant"].includes(message.role) ||
    typeof message.content !== "string" ||
    message.content.length > 10000
  ) {
    return res.status(400).json({
      error: "Invalid message format."
    });
  }

  cleanMessages.push({
    role: message.role,
    content: message.content
  });
}

const groqResponse = await fetch(
  "https://api.groq.com/openai/v1/chat/completions",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: instructions[tool]
        },
        ...cleanMessages
      ],
      temperature: 0.7,
      max_tokens: 2048
    }),
    signal: AbortSignal.timeout(55000)
  }
);

const data = await groqResponse.json();

if (!groqResponse.ok) {
  console.error(
    "Groq error:",
    groqResponse.status,
    JSON.stringify(data).slice(0, 1000)
  );

  return res.status(502).json({
    error:
      data?.error?.message ||
      `AI provider error (${groqResponse.status}). Check Render logs.`
  });
}

const reply = data?.choices?.[0]?.message?.content;

if (typeof reply !== "string" || !reply.trim()) {
  return res.status(502).json({
    error: "AI returned an empty response. Please try again."
  });
}

return res.json({ reply });

} catch (error) {
console.error("Chat error:", error.name, error.message);

if (
  error.name === "TimeoutError" ||
  error.name === "AbortError"
) {
  return res.status(504).json({
    error: "AI request timed out. Please try again."
  });
}

return res.status(500).json({
  error: "Backend error. Check the Render logs."
});

}
});

app.listen(PORT, "0.0.0.0", () => {
console.log("Nexus AI backend running on port ${PORT}");
});
