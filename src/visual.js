const readline = require('readline');
let open;

try {
  open = require('open');
} catch (error) {
  console.warn('open package not available. Visual extras will be logged only.', error.message);
}

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
    if (!this.enabled || !extras.length) {
      return false;
    }

    console.log('Jarvis found visual extras:');
    extras.forEach((extra, index) => {
      console.log(`${index + 1}. ${extra.title || extra.type || 'Item'} -> ${extra.url || 'N/A'}`);
    });

    const answer = await this.prompt('Open these items in your browser? (y/N) ');
    const shouldOpen = answer === 'y' || answer === 'yes';

    if (shouldOpen && open) {
      for (const extra of extras) {
        if (extra.url) {
          await open(extra.url);
        }
      }
      return true;
    }

    return shouldOpen;
  }
}

module.exports = VisualClient;
