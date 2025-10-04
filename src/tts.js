const fs = require('fs');
const path = require('path');
let OpenAI;

try {
  OpenAI = require('openai');
} catch (error) {
  console.warn('openai package not available. TTS will be disabled.', error.message);
}

class TTSClient {
  constructor(outputConfig = {}, audioConfig = {}) {
    this.enabled = outputConfig.tts !== false;
    this.audioConfig = audioConfig;
    this.client = null;

    if (this.enabled && OpenAI && process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  ensureDirectory() {
    const basePath = this.audioConfig.save_path || this.audioConfig.savePath || './recordings';
    const directory = path.resolve(process.cwd(), basePath, 'responses');
    fs.mkdirSync(directory, { recursive: true });
    return directory;
  }

  async speak(text, context = {}) {
    if (!this.enabled) {
      return null;
    }

    if (!text) {
      console.warn('TTS received empty text.');
      return null;
    }

    if (!this.client) {
      console.log(`TTS (mock): ${text}`);
      return null;
    }

    try {
      const directory = this.ensureDirectory();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(directory, `response-${timestamp}.mp3`);

      const speech = await this.client.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        input: text,
      });

      const buffer = Buffer.from(await speech.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`TTS response saved to ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Failed to synthesize speech', error);
      return null;
    }
  }
}

module.exports = TTSClient;
