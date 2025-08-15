import asyncio
from typing import AsyncGenerator
import json
import sys
import os

try:
    from gpt4all import GPT4All
    GPT4ALL_AVAILABLE = True
except ImportError:
    GPT4ALL_AVAILABLE = False
    print("GPT4All not available. Please install it with: pip install gpt4all")

class LocalGPT4All:
    def __init__(self, model_name: str = "orca-mini-3b-gguf2-q4_0.gguf", suppress_output: bool = False):
        if not GPT4ALL_AVAILABLE:
            raise ImportError("GPT4All is not installed")
        
        self.model_name = model_name
        self.model = None
        self.suppress_output = suppress_output
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the GPT4All model"""
        try:
            if not self.suppress_output:
                print(f"Loading model: {self.model_name}")
            
            # Suppress stderr during model loading if needed
            if self.suppress_output:
                stderr_backup = sys.stderr
                sys.stderr = open(os.devnull, 'w')
            
            self.model = GPT4All(self.model_name)
            
            if self.suppress_output:
                sys.stderr.close()
                sys.stderr = stderr_backup
            else:
                print("Model loaded successfully!")
        except Exception as e:
            if not self.suppress_output:
                print(f"Error loading model: {e}")
            # Fallback to even smaller models
            fallback_models = [
                "orca-mini-3b-gguf2-q4_0.gguf",  # ~2GB, much faster
                "all-MiniLM-L6-v2-f16.gguf",     # Very small embedding model
                "gpt4all-falcon-q4_0.gguf"       # Another small option
            ]
            
            for fallback in fallback_models:
                try:
                    if not self.suppress_output:
                        print(f"Trying fallback model: {fallback}")
                    
                    if self.suppress_output:
                        stderr_backup = sys.stderr
                        sys.stderr = open(os.devnull, 'w')
                    
                    self.model = GPT4All(fallback)
                    self.model_name = fallback
                    
                    if self.suppress_output:
                        sys.stderr.close()
                        sys.stderr = stderr_backup
                    else:
                        print(f"Fallback model {fallback} loaded successfully!")
                    break
                except Exception as fallback_error:
                    if not self.suppress_output:
                        print(f"Fallback model {fallback} failed: {fallback_error}")
                    continue
            
            if self.model is None:
                raise Exception("No suitable model could be loaded")
    
    async def chat_completion(self, messages, **kwargs):
        """
        Simulate OpenAI's chat completion API structure
        """
        if not self.model:
            raise Exception("Model not initialized")
        
        # Convert messages to a single prompt
        prompt = self._messages_to_prompt(messages)
        
        # Generate response
        response = self.model.generate(prompt, max_tokens=kwargs.get('max_tokens', 150))
        
        # Return in OpenAI format
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response
                    },
                    "finish_reason": "stop"
                }
            ],
            "model": self.model_name,
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": len(response.split()),
                "total_tokens": len(prompt.split()) + len(response.split())
            }
        }
    
    async def chat_completion_stream(self, messages, **kwargs):
        """
        Stream chat completion responses for real-time display
        """
        if not self.model:
            raise Exception("Model not initialized")
        
        # Convert messages to a single prompt
        prompt = self._messages_to_prompt(messages)
        
        # Generate response (GPT4All doesn't support native streaming, so we'll simulate it)
        response = self.model.generate(prompt, max_tokens=kwargs.get('max_tokens', 150))
        
        # Simulate streaming by yielding chunks
        words = response.split()
        accumulated_text = ""
        
        for i, word in enumerate(words):
            accumulated_text += word
            if i < len(words) - 1:
                accumulated_text += " "
            
            # Yield a chunk in OpenAI streaming format
            chunk = {
                "choices": [
                    {
                        "delta": {
                            "role": "assistant" if i == 0 else None,
                            "content": word + (" " if i < len(words) - 1 else "")
                        },
                        "finish_reason": None if i < len(words) - 1 else "stop"
                    }
                ],
                "model": self.model_name
            }
            
            yield chunk
            
            # Add a small delay to simulate streaming
            await asyncio.sleep(0.05)  # 50ms delay between words
    
    def _messages_to_prompt(self, messages):
        """Convert OpenAI message format to a single prompt"""
        prompt_parts = []
        
        for message in messages:
            role = message.get("role", "")
            content = message.get("content", "")
            
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        
        prompt_parts.append("Assistant:")
        return "\n".join(prompt_parts)

# Global instance
local_gpt = None

def get_local_gpt(suppress_output: bool = False):
    global local_gpt
    if local_gpt is None and GPT4ALL_AVAILABLE:
        try:
            local_gpt = LocalGPT4All(suppress_output=suppress_output)
        except Exception as e:
            if not suppress_output:
                print(f"Failed to initialize local GPT: {e}")
            local_gpt = None
    return local_gpt

if __name__ == "__main__":
    # Test the local model
    async def test_local_gpt():
        gpt = get_local_gpt()
        if gpt:
            messages = [
                {"role": "user", "content": "Hello! How are you?"}
            ]
            response = await gpt.chat_completion(messages)
            print("Response:", response["choices"][0]["message"]["content"])
        else:
            print("Local GPT not available")
    
    asyncio.run(test_local_gpt())
