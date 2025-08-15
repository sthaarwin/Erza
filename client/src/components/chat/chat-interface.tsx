import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Message } from "@shared/schema";
import MessageBubble from "./message-bubble";
import FileUpload from "./file-upload";
import PersonalityDropdown from "./personality-dropdown";
import TypingIndicator from "./typing-indicator";
import { useToast } from "@/hooks/use-toast";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Paperclip, Palette, Send, Bot } from "lucide-react";

interface ChatInterfaceProps {
  sessionId: string;
}

interface ConversationData {
  messages: Message[];
  personality: string;
}

export default function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showPersonalityMenu, setShowPersonalityMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isStreaming, streamingMessage, sendStreamingMessage } = useStreamingChat();

  // Load conversation
  const { data: conversation, isLoading } = useQuery<ConversationData>({
    queryKey: ["/api/conversation", sessionId],
    refetchOnWindowFocus: false,
  });

  const messages = conversation?.messages || [];
  const currentPersonality = conversation?.personality || "friendly";

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message: messageText,
        sessionId,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversation", sessionId] });
      setMessage("");
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Clear conversation mutation
  const clearConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/conversation/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversation", sessionId] });
      toast({
        title: "Success",
        description: "Conversation cleared successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear conversation.",
        variant: "destructive",
      });
    },
  });

  // Update personality mutation
  const updatePersonalityMutation = useMutation({
    mutationFn: async (personality: string) => {
      const response = await apiRequest("POST", "/api/personality", {
        personality,
        sessionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversation", sessionId] });
      setShowPersonalityMenu(false);
      toast({
        title: "Success",
        description: "Personality updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update personality.",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isStreaming, streamingResponse]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [message]);

  const handleSendMessage = async () => {
    if (!message.trim() || isStreaming) return;
    
    const messageToSend = message;
    setMessage("");
    setStreamingResponse("");
    
    try {
      await sendStreamingMessage(
        messageToSend,
        sessionId,
        // onChunk
        (chunk) => {
          setStreamingResponse(chunk.accumulated);
        },
        // onComplete
        (finalMessage) => {
          // Keep the streaming response visible for a moment before clearing
          setTimeout(() => {
            setStreamingResponse("");
            // Refresh conversation to show the final saved message
            queryClient.invalidateQueries({ queryKey: ["/api/conversation", sessionId] });
          }, 500); // Wait 500ms before clearing
          
          if (finalMessage.personalityChanged) {
            toast({
              title: "Personality Updated",
              description: `Switched to ${finalMessage.personality} mode`,
            });
          }
        },
        // onError
        (error) => {
          setStreamingResponse("");
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      setStreamingResponse("");
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertQuickCommand = (command: string) => {
    setMessage(command);
    textareaRef.current?.focus();
  };

  const personalityIcon = {
    friendly: "😊",
    sarcastic: "😏",
    professional: "💼",
    funny: "😄",
  };

  const personalityOptions = [
    { value: "friendly", label: "Friendly", icon: "😊" },
    { value: "sarcastic", label: "Sarcastic", icon: "😏" },
    { value: "professional", label: "Professional", icon: "💼" },
    { value: "funny", label: "Funny", icon: "😄" },
  ];

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-ctp-base">
        <div className="text-ctp-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="bg-ctp-mantle border-b border-ctp-surface0 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-ctp-mauve to-ctp-blue rounded-full flex items-center justify-center">
            <Bot className="text-ctp-text text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ctp-text">Erza</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-ctp-subtext1">
                {personalityIcon[currentPersonality as keyof typeof personalityIcon]} {currentPersonality}
              </span>
              <div className="w-2 h-2 bg-ctp-green rounded-full animate-pulse-slow"></div>
              <span className="text-xs text-ctp-overlay0">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <PersonalityDropdown
            currentPersonality={currentPersonality}
            personalities={personalityOptions}
            onPersonalityChange={(personality: string) => updatePersonalityMutation.mutate(personality)}
            isOpen={showPersonalityMenu}
            onToggle={() => setShowPersonalityMenu(!showPersonalityMenu)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearConversationMutation.mutate()}
            disabled={clearConversationMutation.isPending}
            className="p-2 text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0"
            data-testid="button-clear-chat"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto chat-scroll px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="message-bubble flex items-start space-x-3 animate-fade-in">
              <div className="w-8 h-8 bg-gradient-to-br from-ctp-mauve to-ctp-blue rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                <Bot size={12} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline space-x-2 mb-1">
                  <span className="font-medium text-ctp-text">Erza:</span>
                  <span className="text-xs text-ctp-overlay0">Just now</span>
                </div>
                <div className="bg-ctp-surface0 rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
                  <p className="text-ctp-text">
                    Hi there! I'm Erza, your personal AI assistant. I'm feeling friendly today, but you can change my personality anytime by saying something like "Erza, be sarcastic" or "Reset personality". What would you like to chat about?
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          
          {/* Show streaming response */}
          {isStreaming && streamingResponse && (
            <div className="message-bubble flex items-start space-x-3 animate-fade-in">
              <div className="w-8 h-8 bg-gradient-to-br from-ctp-mauve to-ctp-blue rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                <Bot size={12} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline space-x-2 mb-1">
                  <span className="font-medium text-ctp-text">Erza:</span>
                  <span className="text-xs text-ctp-overlay0">Now</span>
                </div>
                <div className="bg-ctp-surface0 rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
                  <p className="text-ctp-text whitespace-pre-wrap">
                    {streamingResponse}
                    <span className="inline-block w-2 h-4 bg-ctp-text ml-1 animate-pulse">|</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {(isTyping || isStreaming) && !streamingResponse && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-ctp-mantle border-t border-ctp-surface0 p-6">
        {showFileUpload && (
          <FileUpload
            sessionId={sessionId}
            onFileUploaded={(file: { id: string; filename: string; summary: string }) => {
              toast({
                title: "Success",
                description: `File "${file.filename}" uploaded and summarized successfully.`,
              });
              queryClient.invalidateQueries({ queryKey: ["/api/conversation", sessionId] });
            }}
            onClose={() => setShowFileUpload(false)}
          />
        )}

        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <div className="flex items-center space-x-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="p-2 text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0"
                data-testid="button-toggle-file-upload"
              >
                <Paperclip size={16} />
              </Button>
              <div className="text-xs text-ctp-overlay0">
                <span data-testid="text-character-count">{message.length}</span>/2000 characters
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... Try 'Erza, be sarcastic' to change personality!"
              className="w-full bg-ctp-surface0 border-ctp-surface1 text-ctp-text placeholder-ctp-overlay0 resize-none focus:ring-ctp-mauve focus:border-transparent min-h-[3rem] max-h-32"
              maxLength={2000}
              data-testid="input-message"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isStreaming}
            className="bg-ctp-mauve hover:bg-ctp-mauve/80 text-ctp-base p-3 h-12 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            data-testid="button-send-message"
          >
            <Send size={20} />
          </Button>
        </div>

        {/* Quick Commands */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-ctp-overlay0">Quick commands:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertQuickCommand("Erza, be sarcastic")}
            className="text-xs bg-ctp-surface0 hover:bg-ctp-surface1 text-ctp-subtext1 px-2 py-1 h-auto"
            data-testid="button-quick-sarcastic"
          >
            Be sarcastic
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertQuickCommand("Erza, be professional")}
            className="text-xs bg-ctp-surface0 hover:bg-ctp-surface1 text-ctp-subtext1 px-2 py-1 h-auto"
            data-testid="button-quick-professional"
          >
            Be professional
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertQuickCommand("Reset personality")}
            className="text-xs bg-ctp-surface0 hover:bg-ctp-surface1 text-ctp-subtext1 px-2 py-1 h-auto"
            data-testid="button-quick-reset"
          >
            Reset
          </Button>
        </div>
      </footer>
    </div>
  );
}
