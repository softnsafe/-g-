import React, { useState } from 'react';
import { Message, Role } from '../types';

interface ChatBubbleProps {
  message: Message;
  onPlayAudio: (messageId: string, text: string) => void;
  onAnalyze: (text: string) => void;
  primaryColor: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onPlayAudio, onAnalyze, primaryColor }) => {
  const isUser = message.role === Role.USER;
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    setIsPlaying(true);
    onPlayAudio(message.id, message.text);
    // Simple timeout to reset icon, real implementation would track audio element events
    setTimeout(() => setIsPlaying(false), 3000); 
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm relative group
        ${isUser 
          ? `${primaryColor} text-white rounded-br-none` 
          : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none'}`}
      >
        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{message.text}</p>
        
        {/* Actions Row */}
        <div className={`flex items-center gap-2 mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
          
          {/* Audio Button (Both roles can speak, useful for pronunciation or hearing own text) */}
          <button 
            onClick={handlePlayClick}
            disabled={message.isAudioLoading}
            className={`p-1.5 rounded-full transition-colors ${isUser ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
            title="Listen"
          >
            {message.isAudioLoading ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            )}
          </button>

          {/* Grammar Analysis (Only for User messages) */}
          {isUser && (
            <button 
              onClick={() => onAnalyze(message.text)}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
              title="Check Grammar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default ChatBubble;