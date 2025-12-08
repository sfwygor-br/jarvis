import readline from "readline";
import { EventEmitter } from "events";

class WakeWordDetector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.wakeWord = (config.wake_word || "hello").toLowerCase();
    this.active = false;
    this.rl = null;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `Say "${this.wakeWord}" to activate Jarvis > `,
    });

    this.rl.prompt();
    this.rl.on("line", (line) => {
      if (line.trim().toLowerCase() === this.wakeWord) this.emit("wake");
      else console.log("Wake word not detected. Try again.");
      this.rl.prompt();
    });
  }

  stop() {
    this.active = false;
    if (this.rl) { this.rl.close(); this.rl = null; }
  }
}

export default WakeWordDetector;
