import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, personalityChangeSchema, messageSchema } from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";
import pdf from "pdf-parse";
import { randomUUID } from "crypto";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
});

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const personalities = {
  friendly: "You are Erza, a friendly and helpful AI assistant. Be warm, encouraging, and supportive in your responses. Use a conversational tone and show genuine interest in helping the user.",
  sarcastic: "You are Erza, a sarcastic but still helpful AI assistant. Use wit, irony, and playful sarcasm in your responses while still being informative and useful. Don't be mean-spirited.",
  professional: "You are Erza, a professional and formal AI assistant. Be precise, articulate, and business-like in your responses. Maintain a respectful and competent demeanor.",
  funny: "You are Erza, a humorous and entertaining AI assistant. Use jokes, puns, and light-hearted comments while still being helpful. Make conversations enjoyable and fun."
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId, personality } = chatRequestSchema.parse(req.body);
      
      // Update personality if provided
      if (personality) {
        await storage.updatePersonality(sessionId, personality);
      }
      
      // Get conversation history
      const conversation = await storage.getConversation(sessionId);
      const currentPersonality = conversation?.personality || "friendly";
      
      // Create user message
      const userMessage = messageSchema.parse({
        id: randomUUID(),
        role: "user",
        content: message,
        timestamp: Date.now(),
      });
      
      // Add user message to conversation
      await storage.addMessage(sessionId, userMessage);
      
      // Check for personality change commands
      let personalityChanged = false;
      let newPersonality = currentPersonality;
      
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("erza, be") || lowerMessage.includes("erza be")) {
        if (lowerMessage.includes("sarcastic")) {
          newPersonality = "sarcastic";
          personalityChanged = true;
        } else if (lowerMessage.includes("professional")) {
          newPersonality = "professional";
          personalityChanged = true;
        } else if (lowerMessage.includes("funny")) {
          newPersonality = "funny";
          personalityChanged = true;
        } else if (lowerMessage.includes("friendly")) {
          newPersonality = "friendly";
          personalityChanged = true;
        }
      } else if (lowerMessage.includes("reset personality")) {
        newPersonality = "friendly";
        personalityChanged = true;
      }
      
      if (personalityChanged) {
        await storage.updatePersonality(sessionId, newPersonality);
      }
      
      // Prepare messages for OpenAI
      const messages = conversation?.messages || [];
      const recentMessages = Array.isArray(messages) ? messages.slice(-10) : []; // Keep last 10 messages for context
      
      const systemMessage = personalities[newPersonality as keyof typeof personalities];
      
      const openaiMessages = [
        { role: "system" as const, content: systemMessage },
        ...recentMessages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        { role: "user" as const, content: message }
      ];
      
      // Get AI response
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages,
        max_tokens: 500,
        temperature: 0.7,
      });
      
      const aiContent = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
      
      // Add personality change acknowledgment if needed
      let finalResponse = aiContent;
      if (personalityChanged) {
        const ackMessage = `*Personality switched to ${newPersonality}* ${aiContent}`;
        finalResponse = ackMessage;
      }
      
      // Create AI message
      const aiMessage = messageSchema.parse({
        id: randomUUID(),
        role: "assistant",
        content: finalResponse,
        timestamp: Date.now(),
      });
      
      // Add AI message to conversation
      await storage.addMessage(sessionId, aiMessage);
      
      res.json({ 
        message: finalResponse, 
        personality: newPersonality,
        personalityChanged 
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: "Failed to process chat message. Please try again." 
      });
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }
      
      // Check if file is PDF
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are supported" });
      }
      
      // Extract text from PDF
      const pdfData = await pdf(req.file.buffer);
      const content = pdfData.text;
      
      if (!content.trim()) {
        return res.status(400).json({ error: "Could not extract text from PDF" });
      }
      
      // Generate summary using OpenAI
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const summaryCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates concise, informative summaries of documents. Focus on key points, main arguments, and important details."
          },
          {
            role: "user",
            content: `Please provide a comprehensive summary of the following document:\n\n${content.slice(0, 8000)}`
          }
        ],
        max_tokens: 800,
        temperature: 0.3,
      });
      
      const summary = summaryCompletion.choices[0].message.content || "Summary could not be generated.";
      
      // Save file to storage
      const savedFile = await storage.saveFile({
        sessionId,
        filename: req.file.originalname,
        content,
        summary,
      });
      
      res.json({
        id: savedFile.id,
        filename: savedFile.filename,
        summary: savedFile.summary,
        uploadedAt: savedFile.createdAt,
      });
      
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ 
        error: "Failed to process file. Please try again." 
      });
    }
  });

  // Get conversation history
  app.get("/api/conversation/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const conversation = await storage.getConversation(sessionId);
      
      if (!conversation) {
        return res.json({ messages: [], personality: "friendly" });
      }
      
      res.json({
        messages: conversation.messages || [],
        personality: conversation.personality,
      });
      
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Failed to load conversation" });
    }
  });

  // Clear conversation
  app.delete("/api/conversation/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.clearConversation(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear conversation error:", error);
      res.status(500).json({ error: "Failed to clear conversation" });
    }
  });

  // Update personality
  app.post("/api/personality", async (req, res) => {
    try {
      const { personality, sessionId } = personalityChangeSchema.parse(req.body);
      await storage.updatePersonality(sessionId, personality);
      res.json({ personality });
    } catch (error) {
      console.error("Update personality error:", error);
      res.status(500).json({ error: "Failed to update personality" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
