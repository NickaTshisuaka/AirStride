import express from "express";
import OpenAI from "openai";

const router = express.Router();

const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.warn(
    "⚠️  OPENAI_API_KEY is missing! AI routes will fail until you set it in .env"
  );
}

// Initialize OpenAI safely
const openai = new OpenAI({
  apiKey: openaiKey || "sk-test-fallback" // fallback so it doesn't crash
});

router.post("/ask", async (req, res) => {
  if (!openaiKey) {
    return res.status(500).json({ error: "OpenAI API key is not set" });
  }

  try {
    const { question, history } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [...(history || []), { role: "user", content: question }],
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
