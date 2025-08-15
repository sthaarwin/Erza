import { useEffect, useState } from "react";
import ChatInterface from "@/components/chat/chat-interface";

export default function Chat() {
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("erza-session-id");
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem("erza-session-id", newId);
    return newId;
  });

  useEffect(() => {
    document.title = "Erza - Personal AI Chatbot";
  }, []);

  return (
    <div className="h-screen bg-ctp-base text-ctp-text">
      <ChatInterface sessionId={sessionId} />
    </div>
  );
}
