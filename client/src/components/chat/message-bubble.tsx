import { type Message } from "@shared/schema";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`message-bubble flex items-start space-x-3 animate-fade-in ${
        isUser ? "justify-end" : ""
      }`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      {isUser ? (
        <div className="flex-1 flex flex-col items-end">
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="text-xs text-ctp-overlay0" data-testid="text-message-timestamp">
              {timestamp}
            </span>
            <span className="font-medium text-ctp-text">You:</span>
          </div>
          <div className="bg-ctp-mauve rounded-2xl rounded-tr-md px-4 py-3 max-w-lg">
            <p className="text-ctp-base whitespace-pre-wrap" data-testid="text-message-content">
              {message.content}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="font-medium text-ctp-text">Erza:</span>
            <span className="text-xs text-ctp-overlay0" data-testid="text-message-timestamp">
              {timestamp}
            </span>
          </div>
          <div className="bg-ctp-surface0 rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
            <p className="text-ctp-text whitespace-pre-wrap" data-testid="text-message-content">
              {message.content}
            </p>
          </div>
        </div>
      )}

      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 flex-shrink-0 ${
          isUser
            ? "bg-ctp-blue order-first"
            : "bg-gradient-to-br from-ctp-mauve to-ctp-blue order-last"
        }`}
      >
        {isUser ? (
          <User size={12} className="text-white" />
        ) : (
          <Bot size={12} className="text-white" />
        )}
      </div>
    </div>
  );
}