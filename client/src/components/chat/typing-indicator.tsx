import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="message-bubble flex items-start space-x-3 animate-fade-in" data-testid="typing-indicator">
      <div className="w-8 h-8 bg-gradient-to-br from-ctp-mauve to-ctp-blue rounded-full flex items-center justify-center mt-1 flex-shrink-0">
        <Bot size={12} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="font-medium text-ctp-text">Erza:</span>
          <span className="text-xs text-ctp-overlay0">typing...</span>
        </div>
        <div className="bg-ctp-surface0 rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-ctp-overlay0 rounded-full animate-typing"></div>
            <div className="w-2 h-2 bg-ctp-overlay0 rounded-full animate-typing" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-ctp-overlay0 rounded-full animate-typing" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}