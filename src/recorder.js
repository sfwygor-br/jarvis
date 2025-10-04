const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
let record;

try {
  // Lazy import to avoid crashing environments without audio devices during development/testing
  record = require('node-record-lpcm16');
} catch (error) {
  console.warn('node-record-lpcm16 not available. Recorder will operate in mock mode.', error.message);
}

class Recorder extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.recording = null;
    this.filePath = null;
    this.startedAt = null;
  }

  ensureDirectory() {
    const savePath = path.resolve(process.cwd(), this.config.save_path || this.config.savePath || './recordings');
    fs.mkdirSync(savePath, { recursive: true });
    return savePath;
  }

  start() {
    if (this.recording) {
      return;
    }

    const directory = this.ensureDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.wav`;
    this.filePath = path.join(directory, filename);
    this.startedAt = new Date();

    if (record) {
      const options = {
        sampleRate: this.config.sample_rate || 16000,
        channels: this.config.channels || 1,
        threshold: 0,
        endOnSilence: false,
      };

      this.recording = record
        .record(options)
        .stream()
        .pipe(fs.createWriteStream(this.filePath));

      if (this.config.max_record_time) {
        setTimeout(() => this.stop(), this.config.max_record_time * 1000);
      }
    } else {
      // Mock mode for environments without audio capture support.
      fs.writeFileSync(this.filePath, '');
      setTimeout(() => this.stop(), 500);
    }
  }

  stop() {
    if (!this.startedAt) {
      return;
    }

    if (record && this.recording) {
      record.stop();
      this.recording = null;
    }

    const endedAt = new Date();
    const payload = {
      filePath: this.filePath,
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      duration: (endedAt.getTime() - this.startedAt.getTime()) / 1000,
      format: this.config.format || 'wav',
      sampleRate: this.config.sample_rate || 16000,
      channels: this.config.channels || 1,
    };

    this.startedAt = null;
    this.filePath = null;

    this.emit('recordingStopped', payload);
  }
}

module.exports = Recorder;
