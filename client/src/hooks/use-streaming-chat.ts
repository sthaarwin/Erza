import { useState, useCallback } from "react";

export interface StreamingMessage {
  id: string;
  content: string;
  accumulated: string;
  finished: boolean;
  personality?: string;
  personalityChanged?: boolean;
  error?: string;
}

export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);

  const sendStreamingMessage = useCallback(async (
    message: string, 
    sessionId: string,
    onChunk?: (chunk: StreamingMessage) => void,
    onComplete?: (finalMessage: StreamingMessage) => void,
    onError?: (error: string) => void
  ) => {
    setIsStreaming(true);
    setStreamingMessage(null);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            console.log("Received data:", data); // Debug log
            
            if (data === "[DONE]") {
              setIsStreaming(false);
              return;
            }

            try {
              const chunk: StreamingMessage = JSON.parse(data);
              
              console.log("Parsed chunk:", chunk); // Debug log
              
              if (chunk.error) {
                onError?.(chunk.error);
                setIsStreaming(false);
                return;
              }

              setStreamingMessage(chunk);
              onChunk?.(chunk);

              if (chunk.finished) {
                onComplete?.(chunk);
                setIsStreaming(false);
                return;
              }
            } catch (parseError) {
              console.warn("Failed to parse streaming chunk:", parseError, "Data:", data);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send streaming message";
      onError?.(errorMessage);
      setIsStreaming(false);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingMessage(null);
  }, []);

  return {
    isStreaming,
    streamingMessage,
    sendStreamingMessage,
    stopStreaming,
  };
}
