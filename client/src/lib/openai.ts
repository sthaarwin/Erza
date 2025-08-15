import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_KEY || "",
  dangerouslyAllowBrowser: true
});

export default openai;
