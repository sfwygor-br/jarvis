import fs from "fs";
import path from "path";
import yaml from "yaml";

import WakeWordDetector from "./wakeword.js";
import Recorder from "./recorder.js";
import ConversationManager from "./conversation.js";
import LLMClient from "./llm.js";
import TTSClient from "./tts.js";
import VisualClient from "./visual.js";
import MemoryClient from "./memory.js";

function loadConfig() {
  const configPath = path.resolve(process.cwd(), "../config.yaml");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found at ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, "utf8");
  return yaml.parse(raw);
}

async function main() {
  const config = loadConfig();

  if (!process.env.OPENAI_API_KEY && config.llm?.api_key === "ENV") {
    console.warn("⚠️ OPENAI_API_KEY environment variable is not set.");
  }

  const wakeDetector = new WakeWordDetector(config.conversation);
  const recorder = new Recorder(config.audio);
  const conversation = new ConversationManager(config.conversation);
  const llm = new LLMClient(config.llm);
  const tts = new TTSClient(config.output, config.audio);
  const visual = new VisualClient(config.output);
  const memory = new MemoryClient(config.output);

  // 💤 Quando a palavra de ativação for detectada, começa a gravação
  wakeDetector.on("wake", () => {
    console.log("🟢 Wake word detectada. Iniciando gravação...");
    recorder.start();
  });

  // 🎙️ Quando a gravação for finalizada (por silêncio, tempo máximo, etc)
  recorder.on("recordingStopped", async (payload) => {
    try {
      if (!fs.existsSync(payload.filePath)) {
        console.warn("⚠️ Arquivo de áudio não encontrado:", payload.filePath);
        return;
      }

      await memory.registerRecording(payload);
      console.log(`🧠 Gravando arquivo de áudio: ${payload.filePath}`);

      // 🗣️ Transcrever o áudio
      const transcript = await conversation.transcribe(payload.filePath);
      if (!transcript || !transcript.trim()) {
        console.log("🤷 Nenhuma fala detectada. Retornando ao modo de escuta...");
        wakeDetector.start();
        return;
      }

      await conversation.addSegment({
        filePath: payload.filePath,
        transcript,
        startedAt: payload.startedAt,
        endedAt: payload.endedAt,
      });

    } catch (error) {
      console.error("❌ Erro ao processar a gravação:", error);
      wakeDetector.start(); // reativa modo escuta mesmo se falhar
    }
  });

  // 💬 Quando a conversa estiver completa (transcrição finalizada)
  conversation.on("conversationFinalized", async (data) => {
    console.log("💭 Enviando transcrição para o LLM...");
    try {
      const response = await llm.generateResponse(data.transcript, data.context);

      // 🔊 Resposta por voz
      if (config.output?.tts) {
        await tts.speak(response.speech, data);
      }

      // 🖼️ Extras visuais (ex: abrir imagem ou link)
      if (config.output?.visual && response.extras?.length) {
        const shouldOpen = await visual.confirmAndOpen(response.extras);
        if (!shouldOpen) console.log("🟡 Usuário recusou abrir extras visuais.");
      }

      // 🧾 Registrar histórico
      if (config.output?.logs) {
        await memory.registerConversation({
          user_input: data.transcript,
          assistant_response: response.speech,
          extras: response.extras,
          metadata: data.metadata,
        });
      }

      // 💤 Reativar modo de escuta após finalizar
      console.log("💤 Retornando ao modo de escuta...");
      wakeDetector.start();

    } catch (error) {
      console.error("❌ Falha ao gerar resposta LLM:", error);
      wakeDetector.start(); // volta a escutar mesmo se der erro
    }
  });

  // 🧹 Encerramento limpo
  process.on("SIGINT", () => {
    console.log("\n🛑 Encerrando Jarvis...");
    recorder.stop();
    wakeDetector.stop();
    conversation.reset();
    process.exit(0);
  });

  // 🚀 Inicialização do sistema
  console.log("⚙️ Iniciando Jarvis...");
  await memory.bootstrap();
  wakeDetector.start();
}

main().catch((error) => {
  console.error("🚨 Falha ao iniciar o Jarvis:", error);
  process.exit(1);
});
