import type { Profile } from '../onboarding/profile.js';

// Four short first-deck topics per goal (O10c reply options).
// shortcut: fixed lists; Kai picks ideas with AI (level + interests) in the New words change.
const IDEAS: Record<Profile['goal'], [string, string, string, string]> = {
  travel: ['Ordering food', 'Getting around the city', 'Meeting new people', 'At the hotel'],
  work: ['In a meeting', 'Writing emails', 'Small talk with coworkers', 'Job interview'],
  move_abroad: ['Renting a home', 'At the bank', 'Seeing a doctor', 'Talking to neighbors'],
  family_friends: ['Family dinner', 'Catching up with friends', 'Talking about feelings', 'Celebrations'],
  brain: ['Everyday objects', 'Describing people', 'Nature and weather', 'Useful verbs'],
  school: ['In the classroom', 'Homework and exams', 'Talking to teachers', 'School subjects'],
  other: ['Everyday basics', 'Ordering food', 'Meeting new people', 'Getting around the city'],
};

// Every idea once (Kai's script translates them).
export const ideaTopics = (): string[] => [...new Set(Object.values(IDEAS).flat())];

export const ideasFor = (goal: Profile['goal']): string[] => [...IDEAS[goal]];
