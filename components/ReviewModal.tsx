import React, { useState } from 'react';
import { ReviewSession } from '../types';

interface ReviewModalProps {
  data: ReviewSession | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ data, isOpen, onClose, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'practice'>('summary');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  if (!isOpen) return null;

  const handleOptionSelect = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (index === data?.quiz[currentQuestion].correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!data) return;
    if (currentQuestion < data.quiz.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
        // End of quiz logic could go here
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
           <p className="text-sm text-gray-400">Analyzing your conversation patterns...</p>
        </div>
      );
    }

    if (!data) return <p className="text-center text-gray-500 p-8">No review data available. Chat more to generate insights!</p>;

    if (activeTab === 'summary') {
      return (
        <div className="space-y-4 overflow-y-auto max-h-[60vh] p-1">
          {data.summary.map((point, idx) => (
            <div key={idx} className="bg-gray-700 border border-gray-600 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-900/50 text-indigo-300 text-xs font-bold px-2 py-1 rounded">Rule {idx + 1}</span>
                <h4 className="font-bold text-white">{point.ruleName}</h4>
              </div>
              <p className="text-gray-300 text-sm mb-3 leading-relaxed">{point.explanation}</p>
              <div className="bg-gray-800 p-3 rounded-lg border-l-4 border-indigo-500">
                <p className="text-xs text-gray-500 font-medium mb-1 uppercase">From your chat:</p>
                <p className="text-sm text-gray-300 italic">"{point.exampleFromChat}"</p>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setActiveTab('practice')}
            className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow hover:bg-indigo-700 transition-colors"
          >
            Start Practice Quiz
          </button>
        </div>
      );
    }

    // Practice Tab
    const question = data.quiz[currentQuestion];
    const isLastQuestion = currentQuestion === data.quiz.length - 1;

    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-medium text-gray-400">Question {currentQuestion + 1} of {data.quiz.length}</span>
            <span className="text-sm font-bold text-indigo-400">Score: {score}</span>
        </div>

        <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-6">{question.question}</h3>
            
            <div className="space-y-3">
                {question.options.map((option, idx) => {
                    let btnClass = "border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500";
                    if (showResult) {
                        if (idx === question.correctAnswerIndex) btnClass = "bg-green-900/40 border-green-700 text-green-300";
                        else if (idx === selectedOption) btnClass = "bg-red-900/40 border-red-700 text-red-300";
                        else btnClass = "opacity-50 border-gray-700";
                    } else if (selectedOption === idx) {
                        btnClass = "bg-indigo-900/50 border-indigo-500";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleOptionSelect(idx)}
                            disabled={showResult}
                            className={`w-full text-left p-4 rounded-xl border text-sm transition-all ${btnClass}`}
                        >
                            <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {option}
                        </button>
                    );
                })}
            </div>

            {showResult && (
                <div className="mt-6 animate-fadeIn">
                    <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/50 text-sm text-blue-200 mb-4">
                        <span className="font-bold">Explanation: </span> {question.explanation}
                    </div>
                    {isLastQuestion ? (
                        <div className="text-center py-4">
                            <h4 className="font-bold text-xl text-white mb-2">Quiz Complete!</h4>
                            <p className="text-gray-400 mb-4">You scored {score} out of {data.quiz.length}</p>
                            <button 
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                            >
                                Close Review
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleNextQuestion}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium shadow hover:bg-indigo-700"
                        >
                            Next Question
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-900 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📚</span> Review & Practice
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Tabs */}
        {!isLoading && data && (
            <div className="flex border-b border-gray-700 bg-gray-800">
                <button 
                    onClick={() => setActiveTab('summary')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'summary' ? 'border-indigo-500 text-indigo-400 bg-gray-700/50' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    Grammar Summary
                </button>
                <button 
                    onClick={() => setActiveTab('practice')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'practice' ? 'border-indigo-500 text-indigo-400 bg-gray-700/50' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                >
                    Practice Quiz
                </button>
            </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-800 flex-1">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;