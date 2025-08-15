import { type Conversation, type InsertConversation, type UploadedFile, type InsertFile, type Message } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Conversation methods
  getConversation(sessionId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(sessionId: string, updates: Partial<Conversation>): Promise<Conversation>;
  addMessage(sessionId: string, message: Message): Promise<void>;
  updatePersonality(sessionId: string, personality: string): Promise<void>;
  clearConversation(sessionId: string): Promise<void>;
  
  // File methods
  saveFile(file: InsertFile): Promise<UploadedFile>;
  getFile(id: string): Promise<UploadedFile | undefined>;
  getFilesBySession(sessionId: string): Promise<UploadedFile[]>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private files: Map<string, UploadedFile>;

  constructor() {
    this.conversations = new Map();
    this.files = new Map();
  }

  async getConversation(sessionId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(
      (conv) => conv.sessionId === sessionId
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      id,
      sessionId: insertConversation.sessionId,
      messages: insertConversation.messages || [],
      personality: insertConversation.personality || "friendly",
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(sessionId: string, updates: Partial<Conversation>): Promise<Conversation> {
    const existing = await this.getConversation(sessionId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    
    const updated: Conversation = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.conversations.set(existing.id, updated);
    return updated;
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    if (!conversation) {
      // Create new conversation if it doesn't exist
      await this.createConversation({
        sessionId,
        messages: [message],
        personality: "friendly",
      });
    } else {
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      await this.updateConversation(sessionId, {
        messages: [...messages, message],
      });
    }
  }

  async updatePersonality(sessionId: string, personality: string): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    if (conversation) {
      await this.updateConversation(sessionId, { personality });
    } else {
      await this.createConversation({
        sessionId,
        messages: [],
        personality,
      });
    }
  }

  async clearConversation(sessionId: string): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    if (conversation) {
      await this.updateConversation(sessionId, { messages: [] });
    }
  }

  async saveFile(insertFile: InsertFile): Promise<UploadedFile> {
    const id = randomUUID();
    const file: UploadedFile = {
      ...insertFile,
      id,
      summary: insertFile.summary || null,
      createdAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async getFile(id: string): Promise<UploadedFile | undefined> {
    return this.files.get(id);
  }

  async getFilesBySession(sessionId: string): Promise<UploadedFile[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.sessionId === sessionId
    );
  }
}

export const storage = new MemStorage();
