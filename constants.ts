import { Language, Scenario } from './types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', voiceName: 'Kore' },
  { code: 'zh-TW', name: 'Chinese (Traditional / Taiwan)', voiceName: 'Puck' },
  { code: 'zh-CN', name: 'Chinese (Simplified / China)', voiceName: 'Fenrir' }
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'free_chat',
    title: 'Free Chat',
    description: 'Talk about anything you want.',
    icon: '💬',
    systemPrompt: 'You are a friendly and patient language tutor. Engage in a natural conversation with the user. Correct their mistakes gently if they make major errors, but prioritize flow. Keep responses concise (under 50 words) to encourage back-and-forth.'
  },
  {
    id: 'cafe',
    title: 'Ordering Coffee',
    description: 'Practice ordering drinks and food at a cafe.',
    icon: '☕',
    systemPrompt: 'Roleplay: You are a barista at a busy cafe. The user is a customer. Ask them what they want, ask for clarifications (size, milk type), and process their payment. Keep it realistic.'
  },
  {
    id: 'airport',
    title: 'At the Airport',
    description: 'Check-in, security, and boarding conversations.',
    icon: '✈️',
    systemPrompt: 'Roleplay: You are an airport check-in agent. Ask the user for their passport, where they are flying, and if they have bags to check. Be polite but professional.'
  },
  {
    id: 'doctor',
    title: 'Doctor Visit',
    description: 'Describe symptoms and get medical advice.',
    icon: '🩺',
    systemPrompt: 'Roleplay: You are a doctor. The user is a patient describing their symptoms. Ask follow-up questions to diagnose the issue. Use simple medical terms appropriate for a learner.'
  },
  {
    id: 'custom',
    title: 'Custom Scenario',
    description: 'Create your own roleplay situation.',
    icon: '✨',
    systemPrompt: '' // Generated dynamically
  },
];