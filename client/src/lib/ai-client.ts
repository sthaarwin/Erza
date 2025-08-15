import OpenAI from "openai";

// Configuration for AI providers
const AI_CONFIG = {
  provider: import.meta.env.VITE_AI_PROVIDER || "openai", // "openai" or "local"
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_KEY || "",
    model: "gpt-4o"
  },
  local: {
    serverUrl: import.meta.env.VITE_LOCAL_AI_SERVER || "http://localhost:3001/api/chat",
    model: "local-gpt4all"
  }
};

class AIClient {
  private openaiClient: OpenAI | null = null;
  private provider: string;

  constructor() {
    this.provider = AI_CONFIG.provider;
    
    if (this.provider === "openai" && AI_CONFIG.openai.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: AI_CONFIG.openai.apiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  async createChatCompletion(messages: any[], options: any = {}) {
    if (this.provider === "openai" && this.openaiClient) {
      return await this.openaiClient.chat.completions.create({
        model: AI_CONFIG.openai.model,
        messages,
        ...options
      });
    } else if (this.provider === "local") {
      return await this.callLocalAI(messages, options);
    } else {
      throw new Error(`AI provider "${this.provider}" is not properly configured`);
    }
  }

  private async callLocalAI(messages: any[], options: any = {}) {
    try {
      const response = await fetch(AI_CONFIG.local.serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          model: AI_CONFIG.local.model,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error(`Local AI server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Local AI request failed:", error);
      throw new Error("Failed to connect to local AI server");
    }
  }

  getProvider() {
    return this.provider;
  }

  isConfigured() {
    if (this.provider === "openai") {
      return !!this.openaiClient;
    } else if (this.provider === "local") {
      return true; // We'll try to connect when needed
    }
    return false;
  }
}

// Create and export the AI client instance
const aiClient = new AIClient();

export default aiClient;
export { AI_CONFIG };
