const axios = require('axios');

class MemoryClient {
  constructor(outputConfig = {}) {
    this.enabled = outputConfig.logs !== false;
    this.baseUrl = process.env.JARVIS_API_URL || 'http://localhost:8000';
  }

  async bootstrap() {
    if (!this.enabled) return;
    try {
      const response = await axios.get(`${this.baseUrl}/settings/`);
      console.log('Loaded settings from Django API:', response.data);
    } catch (error) {
      console.warn('Unable to load settings from API. Continuing with local config.', error.message);
    }
  }

  async registerConversation(payload) {
    if (!this.enabled) return;
    try {
      await axios.post(`${this.baseUrl}/conversations/`, payload);
    } catch (error) {
      console.error('Failed to log conversation', error.message);
    }
  }

  async registerRecording(payload) {
    if (!this.enabled) return;
    try {
      await axios.post(`${this.baseUrl}/recordings/`, payload);
    } catch (error) {
      console.error('Failed to log recording', error.message);
    }
  }
}

module.exports = MemoryClient;
