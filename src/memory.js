import axios from 'axios';

class MemoryClient {
  constructor(outputConfig = {}) {
    this.enabled = outputConfig.logs !== false;
    this.baseUrl = process.env.JARVIS_API_URL || 'http://localhost:8000';
  }

  async bootstrap() {
    if (!this.enabled) return;
    try {
      const response = await axios.get(`${this.baseUrl}/settings/`);
      console.log('✅ Loaded settings from Django API:', response.data);
    } catch (error) {
      console.warn('⚠️ Unable to load settings from API:', error.message);
    }
  }

  async registerRecording(payload) {
    if (!this.enabled) return;
    try {
      const data = {
        file_path: payload.filePath,
        started_at: payload.startedAt,
        ended_at: payload.endedAt,
        duration: payload.duration,
        format: payload.format,
        sample_rate: payload.sampleRate,
        channels: payload.channels,
      };
      console.log('🎧 Enviando gravação:', data);

      await axios.post(`${this.baseUrl}/recordings/`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('❌ Failed to log recording', error.response?.status, error.response?.data || error.message);
    }
  }

  async registerConversation(payload) {
    if (!this.enabled) return;
    try {
      const data = {
        user_input: payload.userInput,
        assistant_response: payload.assistantResponse,
        extras: payload.extras || {},
        metadata: payload.metadata || {},
      };
      console.log('💬 Enviando conversa:', data);

      await axios.post(`${this.baseUrl}/conversations/`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('❌ Failed to log conversation', error.response?.status, error.response?.data || error.message);
    }
  }
}

export default MemoryClient;
