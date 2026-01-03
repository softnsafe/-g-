import React from 'react';
import { GrammarCorrection } from '../types';

interface GrammarModalProps {
  correction: GrammarCorrection | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
}

const GrammarModal: React.FC<GrammarModalProps> = ({ correction, isOpen, onClose, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-gray-700">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-indigo-400">✨</span> Grammar Check
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
               <p className="text-sm text-gray-400">Analyzing your sentence...</p>
            </div>
          ) : correction ? (
            <div className="space-y-4">
              <div className="bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                <p className="text-xs font-semibold text-red-400 uppercase mb-1">Original</p>
                <p className="text-gray-200">{correction.original}</p>
              </div>

              <div className="bg-green-900/20 p-3 rounded-lg border border-green-900/50">
                <p className="text-xs font-semibold text-green-400 uppercase mb-1">Better Way</p>
                <p className="text-gray-200">{correction.corrected}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-300 mb-1">Why?</p>
                <p className="text-sm text-gray-400 leading-relaxed">{correction.explanation}</p>
              </div>

              <div className="pt-2">
                 <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${correction.mistakeType === 'None' ? 'bg-gray-700 text-gray-300' : 'bg-indigo-900/50 text-indigo-300'}`}>
                    {correction.mistakeType === 'None' ? 'Perfect!' : correction.mistakeType}
                 </span>
              </div>
            </div>
          ) : (
             <p className="text-center text-red-400 py-4">Failed to analyze. Please try again.</p>
          )}
        </div>
        
        <div className="bg-gray-900 px-6 py-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrammarModal;