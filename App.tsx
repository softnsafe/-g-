import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LANGUAGES, SCENARIOS } from './constants';
import { AppState, Language, Message, Role, Scenario, GrammarCorrection, VocabularySuggestion, ReviewSession } from './types';
import { sendMessageToGemini, generateSpeech, analyzeGrammar, createWavUrlFromPcm, getVocabularySuggestions, generateReviewSession } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import ScenarioCard from './components/ScenarioCard';
import GrammarModal from './components/GrammarModal';
import VocabularyModal from './components/VocabularyModal';
import ReviewModal from './components/ReviewModal';
import HelpModal from './components/HelpModal';

const App: React.FC = () => {
  // State
  const [state, setState] = useState<AppState>({
    targetLanguage: null,
    nativeLanguage: null,
    selectedScenario: null,
    messages: [],
    isConfigured: false,
    autoPlayAudio: true, // Default to auto-playing audio for immersion
  });
  
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Custom Scenario Input State
  const [customInput, setCustomInput] = useState({
    topic: '',
    aiRole: '',
    userRole: ''
  });
  
  // Grammar Analysis State
  const [isGrammarModalOpen, setIsGrammarModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [grammarResult, setGrammarResult] = useState<GrammarCorrection | null>(null);

  // Vocabulary State
  const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
  const [isVocabLoading, setIsVocabLoading] = useState(false);
  const [vocabSuggestions, setVocabSuggestions] = useState<VocabularySuggestion[]>([]);

  // Review & Practice State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewSession | null>(null);

  // Help State
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null); // For Web Speech API

  // Helper to stop currently playing audio
  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  };

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  // Handlers
  const handleConfigSubmit = () => {
    if (state.targetLanguage && state.nativeLanguage && state.selectedScenario) {
      
      let scenarioToUse = state.selectedScenario;

      // Handle Custom Scenario Generation
      if (scenarioToUse.id === 'custom') {
        if (!customInput.topic.trim()) return; // Should be handled by UI disabled state, but safety check

        const aiRole = customInput.aiRole.trim() || 'AI Tutor';
        const userRole = customInput.userRole.trim() || 'Student';
        const topic = customInput.topic.trim();

        scenarioToUse = {
            ...scenarioToUse,
            title: topic,
            description: `Roleplay: ${userRole} & ${aiRole}`,
            systemPrompt: `Roleplay Context: You are ${aiRole}. The user is ${userRole}. Situation: ${topic}. Act the part convincingly and help the user learn ${state.targetLanguage.name}.`
        };
      }

      // Initialize chat with system prompt context
      let greeting = '';
      if (scenarioToUse.id === 'free_chat') {
        greeting = 'What would you like to talk about?';
      } else if (scenarioToUse.id === 'custom') {
        greeting = `I am ready. I will play the role of ${customInput.aiRole || 'AI'}. Let's discuss "${customInput.topic}".`;
      } else {
        greeting = 'Let\'s start!';
      }

      const initialMessage: Message = {
        id: uuidv4(),
        role: Role.MODEL,
        text: `Hello! I'm your ${state.targetLanguage.name} tutor. ${greeting}`,
        timestamp: Date.now()
      };

      setState(prev => ({
        ...prev,
        selectedScenario: scenarioToUse,
        isConfigured: true,
        messages: [initialMessage]
      }));

      // Trigger auto-play for the greeting if enabled
      if (state.autoPlayAudio) {
        generateSpeechForMessage(initialMessage, state.targetLanguage.voiceName);
      }
    }
  };

  // Helper to generate and play audio for a message object, then update state
  const generateSpeechForMessage = async (msg: Message, voiceName: string) => {
    // 1. Set loading state
    setState(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === msg.id ? { ...m, isAudioLoading: true } : m)
    }));

    // 2. Generate
    const audioData = await generateSpeech(msg.text, voiceName);

    // 3. Play & Update
    if (audioData) {
        // Convert PCM data to a playable WAV Blob URL
        const url = createWavUrlFromPcm(audioData);
        
        stopAudio(); // Stop any currently playing audio
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        
        try {
            await audio.play();
        } catch (e) {
            console.warn("Auto-play blocked by browser policy", e);
        }

        setState(prev => ({
            ...prev,
            messages: prev.messages.map(m => m.id === msg.id ? { ...m, audioUrl: url, isAudioLoading: false } : m)
        }));
    } else {
        setState(prev => ({
            ...prev,
            messages: prev.messages.map(m => m.id === msg.id ? { ...m, isAudioLoading: false } : m)
        }));
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    // Stop recording if active when sending
    if (isRecording) {
      stopListening();
    }

    const userMsgText = input.trim();
    setInput('');
    setIsSending(true);

    const newUserMsg: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: userMsgText,
      timestamp: Date.now(),
    };

    // Optimistic update for User Message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newUserMsg]
    }));

    try {
      // Prepare history for API
      const history = state.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Augment system instruction
      const fullSystemPrompt = `
        You are an expert language tutor teaching ${state.targetLanguage?.name} to a native ${state.nativeLanguage?.name} speaker.
        Current Scenario: ${state.selectedScenario?.description}
        ${state.selectedScenario?.systemPrompt}
        
        Guidelines:
        1. Always respond in ${state.targetLanguage?.name}.
        2. If the user makes a significant mistake that hinders understanding, politely correct it in ${state.targetLanguage?.name}, maybe providing a hint in ${state.nativeLanguage?.name} in parentheses if complex.
        3. Keep the conversation engaging and relevant to the scenario.
      `;

      const responseText = await sendMessageToGemini(history, userMsgText, fullSystemPrompt);

      const newModelMsg: Message = {
        id: uuidv4(),
        role: Role.MODEL,
        text: responseText,
        timestamp: Date.now(),
      };

      // Update state with Model Message
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, newModelMsg]
      }));

      // Auto-play logic
      if (state.autoPlayAudio && state.targetLanguage) {
          await generateSpeechForMessage(newModelMsg, state.targetLanguage.voiceName);
      }

    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- Speech to Text Logic ---
  const toggleListening = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = state.targetLanguage?.code || 'en-US';

    setIsRecording(true);
    stopAudio(); // Stop any audio playing when user wants to speak

    let baseInput = input; // Snapshot of input before current speech segment

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscriptChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptChunk += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscriptChunk) {
        // Append finalized text to base and update base
        baseInput = baseInput + (baseInput && !baseInput.endsWith(' ') ? ' ' : '') + finalTranscriptChunk;
        setInput(baseInput);
      } else {
        // Show interim text
        const separator = baseInput && !baseInput.endsWith(' ') ? ' ' : '';
        setInput(baseInput + separator + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      // We manually control isRecording state to toggle icon, 
      // but if it stops by itself (timeout), we update state.
      // We don't want to set isRecording(false) here if we plan to restart it (continuous mode usually handles itself),
      // but for UI sync, let's allow it to drop to false if the browser kills it.
      if (isRecording) {
          // It stopped unexpectedly or naturally
          setIsRecording(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      setIsRecording(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };


  const handlePlayAudio = async (messageId: string, text: string) => {
    // Check if we already have the audio
    const messageIndex = state.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    if (state.messages[messageIndex].audioUrl) {
      stopAudio(); // Stop existing
      const audio = new Audio(state.messages[messageIndex].audioUrl);
      currentAudioRef.current = audio;
      audio.play();
      return;
    }

    const voiceName = state.targetLanguage?.voiceName || 'Kore';

    // Set loading
    setState(prev => {
      const newMsgs = [...prev.messages];
      newMsgs[messageIndex] = { ...newMsgs[messageIndex], isAudioLoading: true };
      return { ...prev, messages: newMsgs };
    });

    const audioData = await generateSpeech(text, voiceName);

    setState(prev => {
      const newMsgs = [...prev.messages];
      if (audioData) {
        const url = createWavUrlFromPcm(audioData);
        newMsgs[messageIndex] = { ...newMsgs[messageIndex], audioUrl: url, isAudioLoading: false };
        
        stopAudio(); // Stop existing
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.play();
      } else {
        newMsgs[messageIndex] = { ...newMsgs[messageIndex], isAudioLoading: false };
      }
      return { ...prev, messages: newMsgs };
    });
  };

  const handleAnalyzeGrammar = async (text: string) => {
    if (!state.targetLanguage) return;
    setIsGrammarModalOpen(true);
    setIsAnalyzing(true);
    setGrammarResult(null);

    const result = await analyzeGrammar(state.targetLanguage.name, text);
    
    setGrammarResult(result);
    setIsAnalyzing(false);
  };

  const handleOpenVocab = async () => {
    if (!state.targetLanguage || !state.selectedScenario) return;
    
    setIsVocabModalOpen(true);
    setIsVocabLoading(true);
    setVocabSuggestions([]);

    const historyText = state.messages.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    
    const suggestions = await getVocabularySuggestions(
      state.targetLanguage.name,
      state.selectedScenario.title + ": " + state.selectedScenario.description,
      historyText
    );

    setVocabSuggestions(suggestions);
    setIsVocabLoading(false);
  };

  const handleInsertWord = (word: string) => {
    setInput(prev => prev ? `${prev} ${word}` : word);
  };

  const handleOpenReview = async () => {
    if (!state.targetLanguage || state.messages.length < 2) return;
    
    setIsReviewModalOpen(true);
    setIsReviewLoading(true);
    setReviewData(null);

    const historyText = state.messages.map(m => `${m.role}: ${m.text}`).join('\n\n');
    
    const data = await generateReviewSession(
      state.targetLanguage.name,
      historyText
    );

    setReviewData(data);
    setIsReviewLoading(false);
  };

  // --- Render Views ---

  const renderSetup = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-900 to-black">
      <div className="bg-gray-800 max-w-2xl w-full rounded-3xl shadow-xl p-8 space-y-8 my-8 border border-gray-700">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">LinguistAI</h1>
          <p className="text-gray-400">Your AI-powered immersive language tutor.</p>
        </div>

        <div className="space-y-6">
          {/* Languages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">I speak</label>
              <select 
                className="w-full rounded-xl border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-gray-700 text-white"
                value={state.nativeLanguage?.code || ''}
                onChange={(e) => setState(prev => ({ ...prev, nativeLanguage: LANGUAGES.find(l => l.code === e.target.value) || null }))}
              >
                <option value="">Select Language</option>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">I want to learn</label>
              <select 
                className="w-full rounded-xl border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-gray-700 text-white"
                value={state.targetLanguage?.code || ''}
                onChange={(e) => setState(prev => ({ ...prev, targetLanguage: LANGUAGES.find(l => l.code === e.target.value) || null }))}
              >
                <option value="">Select Language</option>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Scenarios */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Choose a Scenario</label>
            <div className="grid grid-cols-2 gap-4">
              {SCENARIOS.map(s => (
                <ScenarioCard 
                  key={s.id} 
                  scenario={s} 
                  isSelected={state.selectedScenario?.id === s.id}
                  onClick={() => setState(prev => ({ ...prev, selectedScenario: s }))}
                />
              ))}
            </div>

            {/* Custom Scenario Form */}
            {state.selectedScenario?.id === 'custom' && (
                <div className="mt-6 p-5 bg-gray-700/50 rounded-2xl border border-gray-600 animate-fadeIn shadow-inner">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-indigo-400">✨</span> Design your situation
                    </h4>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Topic / Context</label>
                            <input 
                                className="w-full bg-gray-600 rounded-xl border-gray-500 p-3 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                placeholder="e.g. Negotiating a higher salary, Returning a broken item..."
                                value={customInput.topic}
                                onChange={e => setCustomInput({...customInput, topic: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Your Role</label>
                                <input 
                                    className="w-full bg-gray-600 rounded-xl border-gray-500 p-3 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                    placeholder="e.g. Employee"
                                    value={customInput.userRole}
                                    onChange={e => setCustomInput({...customInput, userRole: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">AI's Role</label>
                                <input 
                                    className="w-full bg-gray-600 rounded-xl border-gray-500 p-3 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                    placeholder="e.g. Manager"
                                    value={customInput.aiRole}
                                    onChange={e => setCustomInput({...customInput, aiRole: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleConfigSubmit}
          disabled={!state.targetLanguage || !state.nativeLanguage || !state.selectedScenario || (state.selectedScenario.id === 'custom' && !customInput.topic.trim())}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-[1.01]"
        >
          Start Learning
        </button>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center text-xl text-white">
            {state.selectedScenario?.icon}
          </div>
          <div>
            <h2 className="font-bold text-white">{state.selectedScenario?.title}</h2>
            <p className="text-xs text-gray-400">Learning {state.targetLanguage?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Review Button */}
          <button 
            onClick={handleOpenReview}
            disabled={state.messages.length < 2}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors
              ${state.messages.length < 2 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-700'}`}
            title={state.messages.length < 2 ? "Chat more to enable review" : "Review & Practice"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M11.25 4.533A9.707 9.707 0 006 3.75a9.753 9.753 0 00-3.255.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.755.466A.75.75 0 0021.75 18.5V4.25a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3.75c-2.383 0-4.5.793-6.256 2.118v14.768z" />
            </svg>
            <span className="hidden sm:inline">Review</span>
          </button>

          <button 
            onClick={() => setState(prev => ({ ...prev, autoPlayAudio: !prev.autoPlayAudio }))}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors
              ${state.autoPlayAudio ? 'bg-indigo-900/30 text-indigo-400' : 'text-gray-500 hover:bg-gray-800'}`}
            title={state.autoPlayAudio ? "Auto-play On" : "Auto-play Off"}
          >
            {state.autoPlayAudio ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                </svg>
                <span className="hidden sm:inline">Auto-play</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                </svg>
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </button>
          
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-700"
            title="Help & Features"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </button>

          <button 
            onClick={() => {
              stopAudio();
              setState({ ...state, isConfigured: false, messages: [] });
            }}
            className="text-sm text-red-400 hover:text-red-300 font-medium"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-hide"
      >
        {state.messages.map(msg => (
          <ChatBubble 
            key={msg.id} 
            message={msg} 
            onPlayAudio={handlePlayAudio}
            onAnalyze={handleAnalyzeGrammar}
            primaryColor="bg-indigo-600"
          />
        ))}
        {isSending && (
          <div className="flex justify-start w-full mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm flex items-center gap-2">
               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span>
               <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-700 rounded-2xl p-2">
          {/* Vocabulary Button */}
          <button
            onClick={handleOpenVocab}
            className="p-3 rounded-xl bg-yellow-900/30 hover:bg-yellow-900/50 transition-colors mb-0.5 text-xl"
            title="Get vocabulary suggestions"
          >
            💡
          </button>
        
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in ${state.targetLanguage?.name}...`}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3 px-3 text-white placeholder-gray-400"
            rows={1}
            style={{ minHeight: '48px' }}
          />

          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            className={`p-3 rounded-xl mb-0.5 transition-all duration-300 ${
              isRecording 
                ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]' 
                : 'bg-gray-600 text-gray-400 hover:text-white hover:bg-gray-500'
            }`}
            title={isRecording ? "Stop Recording" : "Speak (Speech-to-Text)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          </button>

          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isSending}
            className={`p-3 rounded-xl mb-0.5 transition-all ${
              !input.trim() || isSending 
                ? 'bg-gray-600 text-gray-400' 
                : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          Tip: Click the 💡 for vocab suggestions, or the magic wand on messages for grammar.
        </p>
      </div>

      <GrammarModal 
        isOpen={isGrammarModalOpen}
        isLoading={isAnalyzing}
        correction={grammarResult}
        onClose={() => setIsGrammarModalOpen(false)}
      />
      
      <VocabularyModal
        isOpen={isVocabModalOpen}
        isLoading={isVocabLoading}
        suggestions={vocabSuggestions}
        onClose={() => setIsVocabModalOpen(false)}
        onSelectWord={handleInsertWord}
      />

      <ReviewModal 
        isOpen={isReviewModalOpen}
        isLoading={isReviewLoading}
        data={reviewData}
        onClose={() => setIsReviewModalOpen(false)}
      />
      
      <HelpModal 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );

  return (
    <div className="font-sans text-white bg-gray-900 h-full min-h-screen">
      {!state.isConfigured ? renderSetup() : renderChat()}
    </div>
  );
};

export default App;