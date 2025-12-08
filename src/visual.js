import readline from "readline";
import open from "open";

class VisualClient {
  constructor(outputConfig = {}) {
    this.enabled = outputConfig.visual !== false;
  }

  prompt(question) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });
  }

  async confirmAndOpen(extras = []) {
    if (!this.enabled || !extras.length) return false;
    console.log("Jarvis found visual extras:");
    extras.forEach((e, i) => console.log(`${i + 1}. ${e.title || "Item"} -> ${e.url || "N/A"}`));

    const answer = await this.prompt("Open in browser? (y/N) ");
    if ((answer === "y" || answer === "yes") && open) {
      for (const e of extras) if (e.url) await open(e.url);
      return true;
    }
    return false;
  }
}

export default VisualClient;
