import TelegramBot from 'node-telegram-bot-api';
import { sessionService } from '../services/sessionService';
import { t } from '../utils/translation';
import { ADMIN_ID } from '../config';

export const languageHandlers = {
  handleLanguageButton: (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);
    
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Русский', callback_data: 'lang_ru' },
            { text: 'O\'zbekcha', callback_data: 'lang_uz' }
          ]
        ]
      }
    };

    bot.sendMessage(chatId, '🌐 Выберите язык / Tilni tanlang:', keyboard);
  },

  handleLanguageChange: async (bot: TelegramBot, chatId: number, lang: 'ru' | 'uz') => {
    const session = sessionService.get(chatId) || sessionService.init(chatId);
    session.language = lang;
    sessionService.update(chatId, session);

    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: t('sendLocation', session) }],
          [{ text: t('changeLanguage', session) }],
          [{ text: t('help', session) }],
          ...(chatId === ADMIN_ID ? [[{ text: t('adminPanel', session) }]] : [])
        ],
        resize_keyboard: true
      }
    };

    await bot.sendMessage(chatId, t('languageChanged', session), keyboard);
  }
};