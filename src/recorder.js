import fs from "fs";
import path from "path";
import { EventEmitter } from "events";
import mic from "mic"; // npm install mic

function ensureDir(dir) {
  const abs = path.resolve(process.cwd(), dir);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}

function sanitizeIso(ts) {
  return ts.replace(/[:]/g, "-");
}

function rms(buffer) {
  // Root Mean Square — energia média do som
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i);
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / (buffer.length / 2)) / 32768;
}

export default class Recorder extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.micInstance = null;
    this.micInputStream = null;
    this.fileStream = null;
    this.filePath = null;
    this.startedAt = null;
    this.silenceTimer = null;
    this.maxTimer = null;
    this.isSpeaking = false;
  }

  start() {
    if (this.micInstance) {
      console.warn("⚠️ Já está gravando.");
      return;
    }

    const outDir = ensureDir(this.config.save_path || "./recordings");
    const stamp = sanitizeIso(new Date().toISOString());
    this.filePath = path.join(outDir, `${stamp}.wav`);
    this.startedAt = new Date();

    const micConfig = {
      rate: String(this.config.sample_rate || 16000),
      channels: String(this.config.channels || 1),
      bitwidth: 16,
      encoding: "signed-integer",
      fileType: "wav",
      endian: "little",
      device: "default",
    };

    console.log("🎙️ Iniciando microfone...");
    this.micInstance = mic(micConfig);
    this.micInputStream = this.micInstance.getAudioStream();
    this.fileStream = fs.createWriteStream(this.filePath);

    this.micInputStream.pipe(this.fileStream);
    this.micInstance.start();
    console.log("🎧 Gravando áudio...");

    const silenceThreshold = this.config.silence_threshold || 0.015; // sensível, mas ignora ruído leve
    const maxSilenceDuration = this.config.wait_after_speech || 5;
    const maxRecordTime = this.config.max_record_time || 30;

    let lastSoundTime = Date.now();

    this.micInputStream.on("data", (data) => {
      const level = rms(data);
      const now = Date.now();

      if (level > silenceThreshold) {
        if (!this.isSpeaking) {
          console.log("🗣️ Fala detectada...");
          this.isSpeaking = true;
        }
        lastSoundTime = now;
      } else if (this.isSpeaking && now - lastSoundTime > maxSilenceDuration * 1000) {
        console.log("🤫 Silêncio detectado. Encerrando...");
        this.stop();
      }
    });

    this.micInputStream.on("error", (err) => {
      console.error("❌ Erro no microfone:", err);
      this._finalize(false);
    });

    this.micInputStream.on("end", () => {
      this._finalize(true);
    });

    // Limite de tempo máximo
    this.maxTimer = setTimeout(() => {
      console.log("⏰ Tempo máximo atingido. Encerrando gravação...");
      this.stop();
    }, maxRecordTime * 1000);
  }

  stop() {
    if (!this.micInstance) return;

    try {
      this.micInstance.stop();
    } catch (err) {
      console.error("⚠️ Erro ao parar o microfone:", err);
    }
  }

  _finalize(success) {
    if (this.maxTimer) clearTimeout(this.maxTimer);
    if (this.fileStream) this.fileStream.end();

    const endedAt = new Date();
    const payload = {
      filePath: this.filePath,
      startedAt: this.startedAt?.toISOString(),
      endedAt: endedAt.toISOString(),
      duration: this.startedAt ? (endedAt - this.startedAt) / 1000 : undefined,
      format: "wav",
      sampleRate: this.config.sample_rate || 16000,
      channels: this.config.channels || 1,
    };

    this.micInstance = null;
    this.micInputStream = null;
    this.fileStream = null;
    this.startedAt = null;
    this.isSpeaking = false;

    if (success && fs.existsSync(payload.filePath) && fs.statSync(payload.filePath).size > 2000) {
      console.log("🛑 Gravação finalizada.");
      this.emit("recordingStopped", payload);
    } else {
      try {
        if (payload.filePath && fs.existsSync(payload.filePath)) {
          fs.unlinkSync(payload.filePath);
        }
      } catch {}
      console.log("🤫 Nenhuma fala detectada. Retornando ao modo de escuta...");
    }
  }
}
