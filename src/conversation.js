const fs = require('fs');
const { EventEmitter } = require('events');
let OpenAI;

try {
  OpenAI = require('openai');
} catch (error) {
  console.warn('openai package not available for transcription.', error.message);
}

class ConversationManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.segments = [];
    this.timer = null;
    this.openai = null;

    if (OpenAI && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async transcribe(filePath) {
    if (!this.openai) {
      console.warn('Transcription skipped: OpenAI client not configured.');
      return '';
    }

    try {
      const response = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
      });
      return response.text?.trim() || '';
    } catch (error) {
      console.error('Failed to transcribe audio', error);
      return '';
    }
  }

  async addSegment(segment) {
    if (!segment) return;

    if (this.segments.length) {
      const lastSegment = this.segments[this.segments.length - 1];
      const lastEnd = new Date(lastSegment.endedAt);
      const currentStart = new Date(segment.startedAt);
      const gapSeconds = (currentStart.getTime() - lastEnd.getTime()) / 1000;
      if (this.config.max_pause && gapSeconds > this.config.max_pause) {
        await this.finalize();
      }
    }

    this.segments.push({ ...segment });
    this.scheduleFinalize();
  }

  scheduleFinalize() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const delay = (this.config.wait_after_speech || 5) * 1000;
    this.timer = setTimeout(() => {
      this.finalize().catch((error) => console.error('Failed to finalize conversation', error));
    }, delay);
  }

  async finalize() {
    if (!this.segments.length) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const transcript = this.segments
      .map((segment) => segment.transcript || '')
      .filter(Boolean)
      .join(' ')
      .trim();

    const metadata = {
      segments: this.segments,
      createdAt: new Date().toISOString(),
    };

    const context = {
      segments: this.segments,
    };

    this.emit('conversationFinalized', {
      transcript,
      metadata,
      context,
    });

    this.segments = [];
  }

  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.segments = [];
  }
}

module.exports = ConversationManager;
