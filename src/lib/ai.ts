
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Corrected model name to the one specified by the user
const MODEL = "google/gemini-3-flash-preview"; 

export const getAiResponse = async (userMessage: string, systemPrompt?: string): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error("VITE_OPENROUTER_API_KEY is not set in your environment variables. Please add it to your .env file.");
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Recommended headers for OpenRouter
        'HTTP-Referer': 'http://localhost:5173', // Replace with your actual site URL in production
        'X-Title': 'Nursing Plus Oncology AI', // Replace with your app's name
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error("Invalid response structure from OpenRouter:", data);
      throw new Error("Failed to get a valid response from the AI.");
    }

  } catch (error) {
    console.error("Error calling OpenRouter:", error);
    return "抱歉，AI服务暂时无法连接。请检查网络或稍后再试。";
  }
};
