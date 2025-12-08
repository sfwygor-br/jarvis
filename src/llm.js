import axios from "axios";
import OpenAI from "openai";

class LLMClient {
  constructor(config = {}) {
    this.config = config;
    this.provider = config.provider || "ollama";
    this.model = config.model || "gemma3:4b";
    this.client = null;

    if (this.provider === "openai" && process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async generateResponse(prompt, context = {}) {
    if (!prompt) {
      return { speech: "I did not catch that.", extras: [] };
    }
    if (this.provider === "ollama") return await this.queryOllama(prompt, context);
    if (this.provider === "openai" && this.client) return await this.queryOpenAI(prompt, context);
    return { speech: "LLM client not configured.", extras: [] };
  }

  async queryOllama(prompt, context = {}) {
    try {
      const systemPrompt = `You are Jarvis. Always respond in JSON {speech, extras}.`;
      const res = await axios.post("http://localhost:11434/api/generate", {
        model: this.model,
        prompt: `${systemPrompt}\nUser transcript: ${prompt}\nContext: ${JSON.stringify(context)}`,
        stream: false,
      });
      const raw = res.data.response;
      const parsed = this.safeJsonParse(raw);
      return parsed || { speech: raw, extras: [] };
    } catch (error) {
      console.error("Ollama request failed", error.message);
      return { speech: "Error while generating response.", extras: [] };
    }
  }

  async queryOpenAI(prompt, context = {}) {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are Jarvis. Reply JSON {speech, extras}" },
          { role: "user", content: `User transcript: ${prompt}\nContext: ${JSON.stringify(context)}` },
        ],
      });
      const raw = completion.choices?.[0]?.message?.content;
      return this.safeJsonParse(raw) || { speech: raw, extras: [] };
    } catch (error) {
      console.error("OpenAI request failed", error.message);
      return { speech: "Error with OpenAI", extras: [] };
    }
  }

  safeJsonParse(value) {
    if (!value) return null;
    try { return JSON.parse(value); }
    catch {
      const match = value.trim().match(/```json([\s\S]*?)```/i);
      if (match) try { return JSON.parse(match[1]); } catch {}
      return null;
    }
  }
}

export default LLMClient;
