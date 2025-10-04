let OpenAI;

try {
  OpenAI = require('openai');
} catch (error) {
  console.warn('openai package not available. LLM responses will be mocked.', error.message);
}

class LLMClient {
  constructor(config = {}) {
    this.config = config;
    this.provider = config.provider || 'openai';
    this.model = config.model || 'gpt-4o-mini';
    this.client = null;

    if (this.provider === 'openai' && OpenAI && process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async generateResponse(prompt, context = {}) {
    if (!prompt) {
      return {
        speech: 'I did not catch that. Could you please repeat?',
        extras: [],
      };
    }

    if (!this.client) {
      console.warn('LLM client not configured. Returning mock response.');
      return {
        speech: 'I am offline at the moment, but I logged your request.',
        extras: [],
      };
    }

    const systemPrompt = `You are Jarvis, a concise voice assistant. Always respond in JSON with keys "speech" (string) and "extras" (array of objects describing optional visual items). The speech must be a short spoken summary. Extras should include title and url when relevant.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `User transcript: ${prompt}\nContext: ${JSON.stringify(context)}`,
          },
        ],
        temperature: 0.7,
      });

      const raw = completion.choices?.[0]?.message?.content;
      if (!raw) {
        throw new Error('No content returned from LLM');
      }

      const parsed = this.safeJsonParse(raw);
      if (parsed) {
        return {
          speech: parsed.speech || '',
          extras: Array.isArray(parsed.extras) ? parsed.extras : [],
        };
      }

      return {
        speech: raw,
        extras: [],
      };
    } catch (error) {
      console.error('LLM request failed', error);
      return {
        speech: 'I encountered an error while generating a response.',
        extras: [],
      };
    }
  }

  safeJsonParse(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      // Sometimes the model responds with fenced code blocks
      const trimmed = value.trim();
      const match = trimmed.match(/```json([\s\S]*?)```/i);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (innerError) {
          console.error('Failed to parse fenced JSON', innerError);
        }
      }
      console.warn('Could not parse JSON response from LLM.');
      return null;
    }
  }
}

module.exports = LLMClient;
