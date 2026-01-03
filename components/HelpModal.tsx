import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: "💬",
      title: "Immersive Chat",
      description: "Chat naturally with an AI tutor who adapts to your scenario and level."
    },
    {
      icon: "🔊",
      title: "Native Pronunciation",
      description: "Click the speaker icon on any message to hear native-level pronunciation."
    },
    {
      icon: "✨",
      title: "Grammar Doctor",
      description: "Click the magic wand on your messages to get instant corrections and explanations."
    },
    {
      icon: "💡",
      title: "Smart Vocabulary",
      description: "Stuck? Click the lightbulb near the input to get 3 context-aware words to use immediately."
    },
    {
      icon: "📚",
      title: "Review & Quiz",
      description: "Click the 'Review' button to generate a summary of your mistakes and a personalized practice quiz."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900">
          <h3 className="text-xl font-bold text-white">What can LinguistAI do?</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div key={idx} className="flex gap-4 p-4 border border-gray-700 rounded-xl hover:shadow-md transition-shadow bg-gray-700/50 hover:bg-gray-700">
                <div className="text-3xl">{feature.icon}</div>
                <div>
                  <h4 className="font-bold text-gray-200 mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700 bg-gray-900 text-center">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
                Start Learning
            </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;