const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WakeWordDetector = require('./wakeword');
const Recorder = require('./recorder');
const ConversationManager = require('./conversation');
const LLMClient = require('./llm');
const TTSClient = require('./tts');
const VisualClient = require('./visual');
const MemoryClient = require('./memory');

function loadConfig() {
  const configPath = path.resolve(process.cwd(), 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found at ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, 'utf8');
  return yaml.parse(raw);
}

async function main() {
  const config = loadConfig();

  if (!process.env.OPENAI_API_KEY && config.llm?.api_key === 'ENV') {
    console.warn('OPENAI_API_KEY environment variable is not set. Some features may be disabled.');
  }

  const wakeDetector = new WakeWordDetector(config.conversation);
  const recorder = new Recorder(config.audio);
  const conversation = new ConversationManager(config.conversation);
  const llm = new LLMClient(config.llm);
  const tts = new TTSClient(config.output, config.audio);
  const visual = new VisualClient(config.output);
  const memory = new MemoryClient(config.output);

  wakeDetector.on('wake', () => {
    console.log('Wake word detected. Starting recording...');
    recorder.start();
  });

  recorder.on('recordingStopped', async (payload) => {
    try {
      await memory.registerRecording(payload);
      const transcript = await conversation.transcribe(payload.filePath);
      await conversation.addSegment({
        filePath: payload.filePath,
        transcript,
        startedAt: payload.startedAt,
        endedAt: payload.endedAt,
      });
    } catch (error) {
      console.error('Error processing recording', error);
    }
  });

  conversation.on('conversationFinalized', async (data) => {
    console.log('Conversation finalized. Sending to LLM...');
    try {
      const response = await llm.generateResponse(data.transcript, data.context);
      if (config.output?.tts) {
        await tts.speak(response.speech, data);
      }

      if (config.output?.visual && response.extras?.length) {
        const shouldOpen = await visual.confirmAndOpen(response.extras);
        if (!shouldOpen) {
          console.log('User declined to open visual extras.');
        }
      }

      if (config.output?.logs) {
        await memory.registerConversation({
          userInput: data.transcript,
          assistantResponse: response.speech,
          extras: response.extras,
          metadata: data.metadata,
        });
      }
    } catch (error) {
      console.error('Failed to generate response', error);
    }
  });

  process.on('SIGINT', () => {
    console.log('Shutting down Jarvis 1.0...');
    recorder.stop();
    wakeDetector.stop();
    conversation.reset();
    process.exit(0);
  });

  await memory.bootstrap();
  wakeDetector.start();
}

main().catch((error) => {
  console.error('Jarvis failed to start:', error);
  process.exit(1);
});
