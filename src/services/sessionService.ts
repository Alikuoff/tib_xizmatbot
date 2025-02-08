import { UserSession } from '../types';

// User session storage
const userSessions = new Map<number, UserSession>();

export const sessionService = {
  get: (chatId: number) => userSessions.get(chatId),
  
  init: (chatId: number): UserSession => {
    const session: UserSession = {
      step: 'idle',
      language: 'ru',
      subscribedCategories: []
    };
    userSessions.set(chatId, session);
    return session;
  },
  
  update: (chatId: number, session: UserSession) => {
    userSessions.set(chatId, session);
  },
  
  getAll: () => Array.from(userSessions.entries()),
  
  getSize: () => userSessions.size,
  
  getActiveUsers: () => Array.from(userSessions.values()).filter(s => s.lastLocation).length,
  
  getSubscribedUsers: () => Array.from(userSessions.values()).filter(s => s.subscribedCategories.length > 0).length
};