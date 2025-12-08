import fs from "fs";
import path from "path";
import OpenAI from "openai";

class TTSClient {
  constructor(outputConfig = {}, audioConfig = {}) {
    this.enabled = outputConfig.tts !== false;
    this.audioConfig = audioConfig;
    this.client = (this.enabled && process.env.OPENAI_API_KEY) ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  ensureDirectory() {
    const basePath = this.audioConfig.save_path || "./recordings";
    const directory = path.resolve(process.cwd(), basePath, "responses");
    fs.mkdirSync(directory, { recursive: true });
    return directory;
  }

  async speak(text) {
    if (!this.enabled || !text) return null;
    if (!this.client) return console.log(`TTS (mock): ${text}`);

    try {
      const directory = this.ensureDirectory();
      const filePath = path.join(directory, `response-${Date.now()}.mp3`);
      const speech = await this.client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: text,
      });
      const buffer = Buffer.from(await speech.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`TTS saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("Failed TTS", error.message);
      return null;
    }
  }
}

export default TTSClient;
