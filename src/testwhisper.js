import fs from "fs";
import { pipeline } from "@xenova/transformers";

const run = async () => {
  try {
    console.log("⏳ Carregando modelo Whisper...");
    const transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-base"
    );

    console.log("🎤 Lendo arquivo src/test.wav...");
    const audioBuffer = fs.readFileSync("src/test.wav");

    console.log("🎧 Transcrevendo...");
    const result = await transcriber(audioBuffer);

    console.log("✅ Objeto completo:", result);
    console.log("📝 Transcrição:", result.text || result[0]?.text);
  } catch (err) {
    console.error("❌ Erro no Whisper:", err);
  }
};

run();
