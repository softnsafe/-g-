import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GrammarCorrection, VocabularySuggestion, ReviewSession } from "../types";

// Initialize Gemini Client
// CRITICAL: process.env.API_KEY is handled by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Text Chat Service
export const sendMessageToGemini = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  systemInstruction: string,
  modelName: string = 'gemini-3-flash-preview'
): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
      },
      history: history,
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I'm sorry, I didn't catch that.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

// 2. TTS Service (Text to Speech)

// Helper: Convert Base64 string to Uint8Array
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper: Write string to DataView
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Helper: Add WAV header to raw PCM data
// Gemini TTS returns raw PCM: 24kHz, 1 channel, 16-bit
const addWavHeader = (samples: Int16Array, sampleRate: number = 24000, numChannels: number = 1): ArrayBuffer => {
  const buffer = new ArrayBuffer(44 + samples.byteLength);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.byteLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.byteLength, true);

  // Write the PCM samples
  const samplesBytes = new Uint8Array(samples.buffer);
  const dataBytes = new Uint8Array(buffer, 44);
  dataBytes.set(samplesBytes);

  return buffer;
};

// Exported Helper: Create a Blob URL for a WAV file from raw PCM base64
export const createWavUrlFromPcm = (base64Pcm: string): string => {
  try {
    const uint8 = base64ToUint8Array(base64Pcm);
    const int16 = new Int16Array(uint8.buffer);
    const wavBuffer = addWavHeader(int16);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Error converting PCM to WAV", e);
    return "";
  }
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    }
    return null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};

// 3. Grammar Analysis Service (Structured Output)
export const analyzeGrammar = async (
  targetLanguage: string,
  userText: string
): Promise<GrammarCorrection | null> => {
  try {
    const prompt = `Analyze the following sentence in ${targetLanguage} for grammar and vocabulary mistakes. If it is correct, suggest a more natural way to say it.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'user', parts: [{ text: userText }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            corrected: { type: Type.STRING },
            explanation: { type: Type.STRING },
            mistakeType: { type: Type.STRING, description: "Grammar, Vocabulary, Spelling, or None" }
          },
          required: ["original", "corrected", "explanation", "mistakeType"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GrammarCorrection;
    }
    return null;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

// 4. Contextual Vocabulary Service
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
      
      Suggest 3 useful, high-quality vocabulary words, idioms, or short phrases that the user could effectively use in their NEXT response or generally in this context. 
      If the language is Chinese (any variant), include Pinyin in the pronunciation field.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING, description: "The word or phrase in the target language" },
              pronunciation: { type: Type.STRING, description: "IPA or Pinyin" },
              translation: { type: Type.STRING, description: "Meaning in English" },
              example: { type: Type.STRING, description: "An example sentence using the term in context" }
            },
            required: ["term", "pronunciation", "translation", "example"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as VocabularySuggestion[];
    }
    return [];
  } catch (error) {
    console.error("Gemini Vocabulary Error:", error);
    return [];
  }
};

// 5. Review & Practice Service
export const generateReviewSession = async (
  targetLanguage: string,
  conversationHistory: string
): Promise<ReviewSession | null> => {
  try {
    const prompt = `
      Act as a strict but helpful language teacher. 
      Analyze the following conversation history in ${targetLanguage}.
      
      1. Identify the 3 most important grammar rules or patterns that appeared (or were misused) in the conversation.
      2. Summarize these rules with explanations and reference the user's or model's messages as examples.
      3. Create 3 multiple-choice practice questions (Quiz) specifically testing these rules to help the user practice.
      
      Conversation History:
      ${conversationHistory}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ruleName: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  exampleFromChat: { type: Type.STRING, description: "A quote from the conversation illustrating this rule" }
                },
                required: ["ruleName", "explanation", "exampleFromChat"]
              }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Array of 4 options" 
                  },
                  correctAnswerIndex: { type: Type.INTEGER, description: "0-3 index of the correct option" },
                  explanation: { type: Type.STRING, description: "Why this answer is correct" }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
              }
            }
          },
          required: ["summary", "quiz"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ReviewSession;
    }
    return null;
  } catch (error) {
    console.error("Gemini Review Error:", error);
    return null;
  }
};