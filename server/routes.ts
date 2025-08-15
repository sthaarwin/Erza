import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, personalityChangeSchema, messageSchema } from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";
import pdf from "pdf-parse";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.VITE_OPENAI_API_KEY || ""
});

// Local AI function using Python GPT4All
async function callLocalAI(messages: any[], options: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'local_gpt.py');
    const pythonPath = '/home/arwin/codes/projects/ErzaMind/.venv/bin/python';
    const python = spawn(pythonPath, ['-c', `
import sys
sys.path.append('${__dirname}')
from local_gpt import get_local_gpt
import asyncio
import json

async def main():
    gpt = get_local_gpt(suppress_output=True)
    if gpt:
        messages = ${JSON.stringify(messages)}
        response = await gpt.chat_completion(messages, **${JSON.stringify(options)})
        print(json.dumps(response))
    else:
        print(json.dumps({"error": "Local GPT not available"}))

asyncio.run(main())
`]);

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          // Extract JSON from the output by finding the last line that looks like JSON
          const lines = output.trim().split('\n');
          let jsonLine = '';
          
          // Look for the JSON response (it should start with { and contain "choices")
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.includes('"choices"')) {
              jsonLine = line;
              break;
            }
          }
          
          if (!jsonLine) {
            reject(new Error(`No valid JSON response found in output: ${output}`));
            return;
          }
          
          const result = JSON.parse(jsonLine);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${output}`));
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${error}`));
      }
    });
  });
}

// Streaming Local AI function
async function callLocalAIStreamChunks(messages: any[], options: any = {}): Promise<any[]> {
  const pythonPath = '/home/arwin/codes/projects/ErzaMind/.venv/bin/python';
  
  return new Promise((resolve, reject) => {
    const python = spawn(pythonPath, ['-c', `
import sys
sys.path.append('${__dirname}')
from local_gpt import get_local_gpt
import asyncio
import json

async def main():
    gpt = get_local_gpt(suppress_output=True)
    if gpt:
        messages = ${JSON.stringify(messages)}
        async for chunk in gpt.chat_completion_stream(messages, **${JSON.stringify(options)}):
            print(json.dumps(chunk))
            sys.stdout.flush()
    else:
        print(json.dumps({"error": "Local GPT not available"}))

asyncio.run(main())
`]);

    const chunks: any[] = [];
    let buffer = '';

    python.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk = JSON.parse(line.trim());
            if (chunk.error) {
              reject(new Error(chunk.error));
              return;
            }
            chunks.push(chunk);
          } catch (parseError) {
            // Skip non-JSON lines (like model loading messages)
            continue;
          }
        }
      }
    });

    python.stderr.on('data', (data) => {
      // Log errors but don't reject immediately as they might be warnings
      console.warn('Python stderr:', data.toString());
    });

    python.on('close', (code) => {
      if (code === 0) {
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer.trim());
            if (!chunk.error) {
              chunks.push(chunk);
            }
          } catch (parseError) {
            // Ignore final parsing errors
          }
        }
        resolve(chunks);
      } else {
        reject(new Error(`Python script failed with code ${code}`));
      }
    });
  });
}

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
      
      // Prepare messages for AI
      const messages = conversation?.messages || [];
      const recentMessages = Array.isArray(messages) ? messages.slice(-10) : []; // Keep last 10 messages for context
      
      const systemMessage = personalities[newPersonality as keyof typeof personalities];
      
      const aiMessages = [
        { role: "system" as const, content: systemMessage },
        ...recentMessages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        { role: "user" as const, content: message }
      ];
      
      let aiContent: string;
      
      // Use local AI if available, fallback to OpenAI
      try {
        console.log("Attempting to use local AI...");
        const localResult = await callLocalAI(aiMessages, {
          max_tokens: 150,
          temperature: 0.7,
        });
        aiContent = localResult.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
        console.log("Local AI response successful");
      } catch (localError) {
        const errorMessage = localError instanceof Error ? localError.message : String(localError);
        console.log("Local AI failed, falling back to OpenAI:", errorMessage);
        
        // Fallback to OpenAI if local AI fails
        if (!openai.apiKey) {
          throw new Error("Neither local AI nor OpenAI are properly configured");
        }
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: aiMessages,
          max_tokens: 500,
          temperature: 0.7,
        });
        
        aiContent = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
        console.log("OpenAI response successful");
      }
      
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

  // Streaming Chat endpoint
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { message, sessionId, personality } = chatRequestSchema.parse(req.body);
      
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

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
      
      // Prepare messages for AI
      const messages = conversation?.messages || [];
      const recentMessages = Array.isArray(messages) ? messages.slice(-10) : [];
      
      const systemMessage = personalities[newPersonality as keyof typeof personalities];
      
      const aiMessages = [
        { role: "system" as const, content: systemMessage },
        ...recentMessages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        { role: "user" as const, content: message }
      ];
      
      let accumulatedResponse = "";
      let messageId = randomUUID();
      
      try {
        console.log("Attempting to use local AI streaming...");
        
        // Get all chunks from local AI
        const chunks = await callLocalAIStreamChunks(aiMessages, {
          max_tokens: 150,
          temperature: 0.7,
        });
        
        // Stream chunks to client with delays for real-time effect
        for (const chunk of chunks) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            accumulatedResponse += content;
            
            // Send streaming chunk to client
            res.write(`data: ${JSON.stringify({
              id: messageId,
              content: content,
              accumulated: accumulatedResponse,
              finished: chunk.choices[0]?.finish_reason === "stop"
            })}\n\n`);
            
            // Add delay to simulate real-time streaming
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          if (chunk.choices[0]?.finish_reason === "stop") {
            break;
          }
        }
        
        console.log("Local AI streaming successful");
        
      } catch (localError) {
        console.log("Local AI streaming failed, falling back to OpenAI:", localError);
        
        // Fallback to OpenAI streaming
        if (openai.apiKey) {
          const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: aiMessages,
            max_tokens: 500,
            temperature: 0.7,
            stream: true,
          });
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              accumulatedResponse += content;
              
              res.write(`data: ${JSON.stringify({
                id: messageId,
                content: content,
                accumulated: accumulatedResponse,
                finished: chunk.choices[0]?.finish_reason === "stop"
              })}\n\n`);
            }
            
            if (chunk.choices[0]?.finish_reason === "stop") {
              break;
            }
          }
        } else {
          throw new Error("Neither local AI nor OpenAI are properly configured");
        }
      }
      
      // Add personality change acknowledgment if needed
      let finalResponse = accumulatedResponse;
      if (personalityChanged) {
        const ackMessage = `*Personality switched to ${newPersonality}* `;
        finalResponse = ackMessage + accumulatedResponse;
      }
      
      // Create AI message and save to storage
      const aiMessage = messageSchema.parse({
        id: messageId,
        role: "assistant",
        content: finalResponse,
        timestamp: Date.now(),
      });
      
      await storage.addMessage(sessionId, aiMessage);
      
      // Send final message
      res.write(`data: ${JSON.stringify({
        id: messageId,
        content: "",
        accumulated: finalResponse,
        finished: true,
        personality: newPersonality,
        personalityChanged
      })}\n\n`);
      
      res.write('data: [DONE]\n\n');
      res.end();
      
    } catch (error) {
      console.error("Streaming chat error:", error);
      res.write(`data: ${JSON.stringify({
        error: "Failed to process chat message. Please try again."
      })}\n\n`);
      res.end();
    }
  });

  // Local AI Chat endpoint
  app.post("/api/chat/local", async (req, res) => {
    try {
      const { messages, model, ...options } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }
      
      // Call local AI
      const result = await callLocalAI(messages, options);
      
      res.json(result);
      
    } catch (error) {
      console.error("Local AI Chat error:", error);
      res.status(500).json({ 
        error: "Failed to process local AI chat message. Please try again." 
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
