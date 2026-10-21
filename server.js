"use strict";

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "30kb" }));

app.get("/", (req, res) => {
  res.json({
    name: "Nexus AI",
    status: "online",
    message: "Nexus AI backend is running."
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Groq API key is not configured on the server."
      });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please send a message."
      });
    }

    if (messages.length > 30) {
      return res.status(400).json({
        error: "Too many messages in one request."
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

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are Nexus AI, a helpful AI assistant. Answer clearly. " +
                "When writing code, explain which file it belongs in."
            },
            ...cleanMessages
          ],
          temperature: 0.7,
          max_tokens: 2048
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", response.status);

      return res.status(502).json({
        error:
          data?.error?.message ||
          "The AI provider could not complete the request."
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string") {
      return res.status(502).json({
        error: "The AI provider returned an unexpected response."
      });
    }

    res.json({ reply: answer });

  } catch (error) {
    console.error("Chat request failed:", error.message);

    res.status(500).json({
      error: "Could not get an AI response. Please try again."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexus AI backend listening on port ${PORT}`);
});
