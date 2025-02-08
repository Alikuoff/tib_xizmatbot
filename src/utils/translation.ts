import { UserSession, TranslationKeys } from '../types';
import { translations } from '../translations';

export function t(key: keyof TranslationKeys, session: UserSession): string {
  return translations[session.language][key];
}