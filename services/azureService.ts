import { AzureOpenAI } from "openai";
import { GrammarCorrection, VocabularySuggestion, ReviewSession, Role } from "../types";

// Initialize Azure OpenAI Client
// process.env variables are injected by Vite based on Vercel env settings
const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: "2024-05-01-preview", // Check your Azure resource for supported versions
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT, // The name of your model deployment
  dangerouslyAllowBrowser: true // Required for client-side usage (Note: exposing API keys in client-side code is risky for public apps, but standard for this architecture)
});

// 1. Text Chat Service
export const sendMessageToAzure = async (
  history: { role: Role; content: string }[],
  newMessage: string,
  systemInstruction: string
): Promise<string> => {
  try {
    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map(msg => ({ role: msg.role === Role.MODEL ? "assistant" : "user", content: msg.content })),
      { role: "user", content: newMessage }
    ] as any;

    const result = await client.chat.completions.create({
      messages: messages,
      model: "", // Model is handled by the deployment param in Client, but SDK might require a string here
      max_tokens: 300,
      temperature: 0.7,
    });

    return result.choices[0].message.content || "I'm sorry, I didn't catch that.";
  } catch (error) {
    console.error("Azure Chat Error:", error);
    throw error;
  }
};

// 2. TTS Service
export const generateSpeech = async (text: string, voiceName: string): Promise<string | null> => {
  try {
    // Note: Azure OpenAI TTS requires a deployment capable of TTS (e.g., tts-1)
    // If your main deployment is GPT-4, this might fail unless you have a separate TTS deployment or if the same endpoint supports it.
    // For simplicity, we assume the user has a deployment named 'tts-1' or similar mapped, OR we assume the generic endpoint handles it.
    // If using a specific TTS deployment name:
    const ttsClient = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: "2024-05-01-preview", 
        deployment: "tts-1", // You might need to change this if your TTS deployment has a different name
        dangerouslyAllowBrowser: true 
    });

    const response = await ttsClient.audio.speech.create({
      model: "tts-1", // This is often ignored by Azure in favor of the deployment name, but required by SDK types
      voice: voiceName as any, // alloy, echo, fable, onyx, nova, and shimmer
      input: text,
      response_format: 'wav'
    });

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Azure TTS Error:", error);
    return null;
  }
};

// 3. Grammar Analysis
export const analyzeGrammar = async (
  targetLanguage: string,
  userText: string
): Promise<GrammarCorrection | null> => {
  try {
    const prompt = `Analyze the following sentence in ${targetLanguage} for grammar and vocabulary mistakes. 
    Return a JSON object with keys: "original", "corrected", "explanation", "mistakeType" (Grammar, Vocabulary, Spelling, or None).`;

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful grammar tutor. Output valid JSON." },
        { role: "user", content: `${prompt}\n\nSentence: "${userText}"` }
      ],
      model: "",
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (content) {
      return JSON.parse(content) as GrammarCorrection;
    }
    return null;
  } catch (error) {
    console.error("Azure Analysis Error:", error);
    return null;
  }
};

// 4. Vocabulary
export const getVocabularySuggestions = async (
  targetLanguage: string,
  scenarioContext: string,
  recentHistory: string
): Promise<VocabularySuggestion[]> => {
  try {
    const prompt = `
      You are a vocabulary tutor.
      Target Language: ${targetLanguage}
      Scenario: ${scenarioContext}
      Recent Conversation: ${recentHistory}
      
      Suggest 3 useful, high-quality vocabulary words.
      Return a JSON object with a key "suggestions" which is an array of objects containing: "term", "pronunciation", "translation", "example".
    `;

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a vocabulary helper. Output valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "",
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.suggestions || [];
    }
    return [];
  } catch (error) {
    console.error("Azure Vocabulary Error:", error);
    return [];
  }
};

// 5. Review
export const generateReviewSession = async (
  targetLanguage: string,
  conversationHistory: string
): Promise<ReviewSession | null> => {
  try {
    const prompt = `
      Analyze the conversation history in ${targetLanguage}.
      Create a review session in JSON format with two keys:
      1. "summary": Array of objects { "ruleName", "explanation", "exampleFromChat" }
      2. "quiz": Array of objects { "question", "options" (array of 4 strings), "correctAnswerIndex" (0-3 number), "explanation" }
      
      Conversation History:
      ${conversationHistory}
    `;

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a strict language teacher. Output valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "",
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (content) {
      return JSON.parse(content) as ReviewSession;
    }
    return null;
  } catch (error) {
    console.error("Azure Review Error:", error);
    return null;
  }
};