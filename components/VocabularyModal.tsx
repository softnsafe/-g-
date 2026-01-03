import React from 'react';
import { VocabularySuggestion } from '../types';

interface VocabularyModalProps {
  suggestions: VocabularySuggestion[];
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  onSelectWord: (word: string) => void;
}

const VocabularyModal: React.FC<VocabularyModalProps> = ({ suggestions, isOpen, onClose, isLoading, onSelectWord }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative max-h-[90vh] flex flex-col border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-yellow-400">💡</span> Smart Vocabulary
            </h3>
            <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
               <p className="text-sm text-gray-400">Finding the perfect words for this context...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-2">Try using these words in your next message:</p>
              {suggestions.map((item, index) => (
                <div key={index} className="bg-yellow-900/10 rounded-xl p-4 border border-yellow-900/30 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h4 className="text-lg font-bold text-white">{item.term}</h4>
                            <span className="text-sm text-gray-400 font-mono">{item.pronunciation}</span>
                        </div>
                        <p className="text-sm text-gray-300 italic">{item.translation}</p>
                    </div>
                    <button 
                        onClick={() => {
                            onSelectWord(item.term);
                            onClose();
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-600"
                    >
                        Use this
                    </button>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2 text-xs text-gray-400 mt-2 border border-gray-700">
                    Example: {item.example}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-8">
                <p className="text-gray-500">No suggestions available right now. Try continuing the conversation!</p>
             </div>
          )}
        </div>
        
        <div className="bg-gray-900 px-6 py-4 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-500">Suggestions are based on your current conversation scenario.</p>
        </div>
      </div>
    </div>
  );
};

export default VocabularyModal;