import fs from "fs";
import EventEmitter from "events";
import { pipeline } from "@xenova/transformers";
import wav from "node-wav";

export default class ConversationManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.model = config.model || "Xenova/whisper-tiny.en";
    this.transcriber = null;
    this.segments = [];
    this.context = {};
  }

  async init() {
    if (!this.transcriber) {
      console.log(`⏳ Carregando modelo Whisper: ${this.model}`);

      const keyStatus = process.env.HUGGINGFACE_ACCESS_TOKEN
        ? "✔️ Detectada"
        : "⚠️ Não encontrada (usando acesso público)";
      console.log(`🔑 Token HuggingFace: ${keyStatus}`);

      this.transcriber = await pipeline("automatic-speech-recognition", this.model, {
        revision: "main",
        use_auth_token: process.env.HUGGINGFACE_ACCESS_TOKEN,
      });

      console.log(`✅ Modelo ${this.model} carregado com sucesso.`);
    }
  }

  async transcribe(filePath) {
    try {
      await this.init();

      console.log(`🎤 Lendo arquivo de áudio: ${filePath}`);
      const buffer = fs.readFileSync(filePath);
      const decoded = wav.decode(buffer);

      if (!decoded.channelData || !decoded.channelData[0]) {
        console.warn("⚠️ Nenhum canal de áudio detectado. Abortando transcrição.");
        return "";
      }

      // Transcrição via Float32Array
      const audioData = decoded.channelData[0]; // Float32Array do canal principal

      console.log("🎧 Transcrevendo...");
      const result = await this.transcriber(audioData, {
        sampling_rate: decoded.sampleRate,
      });

      const text = result.text || result[0]?.text || "";
      console.log("📝 Transcrição:", text);

      return text;
    } catch (error) {
      console.error("❌ Erro ao transcrever:", error.message);
      return "";
    }
  }

  async addSegment(segment) {
    this.segments.push(segment);

    if (this.segments.length > 0) {
      const transcript = this.segments.map((s) => s.transcript).join(" ");
      this.emit("conversationFinalized", {
        transcript,
        context: this.context,
        metadata: { totalSegments: this.segments.length },
      });
    }
  }

  reset() {
    this.segments = [];
    this.context = {};
  }
}
