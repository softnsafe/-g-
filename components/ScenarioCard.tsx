import React from 'react';
import { Scenario } from '../types';

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onClick: () => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isSelected, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer rounded-xl p-4 border transition-all duration-200 flex flex-col items-center text-center gap-2
        ${isSelected 
          ? 'border-indigo-500 bg-indigo-900/30 ring-2 ring-indigo-500' 
          : 'border-gray-600 bg-gray-700 hover:border-indigo-500 hover:shadow-md'}
      `}
    >
      <div className="text-4xl mb-1">{scenario.icon}</div>
      <h3 className="font-semibold text-white">{scenario.title}</h3>
      <p className="text-xs text-gray-400 line-clamp-2">{scenario.description}</p>
    </div>
  );
};

export default ScenarioCard;