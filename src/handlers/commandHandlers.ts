import TelegramBot from 'node-telegram-bot-api';
import { sessionService } from '../services/sessionService';
import { t } from '../utils/translation';
import { ADMIN_ID } from '../config';

export const commandHandlers = {
  handleStart: (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.init(chatId);
    
    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: t('sendLocation', session) }],
          [{ text: t('changeLanguage', session) }],
          [{ text: '❓ ' + t('help', session) }],
          ...(chatId === ADMIN_ID ? [[{ text: t('adminPanel', session) }]] : [])
        ],
        resize_keyboard: true
      }
    };

    bot.sendMessage(chatId, t('welcome', session), keyboard);
  },

  handleHelp: (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);
    
    const helpMessage = `${t('help', session)}:

/start - ${session.language === 'ru' ? 'Запустить бота' : 'Botni ishga tushirish'}
/help - ${session.language === 'ru' ? 'Справка' : 'Yordam'}
/catalog - ${session.language === 'ru' ? 'Каталог услуг' : 'Xizmatlar katalogi'}

${session.language === 'ru' ? 'Дополнительные функции:' : 'Qo\'shimcha funksiyalar:'}
📍 - ${session.language === 'ru' ? 'Поиск ближайших клиник' : 'Eng yaqin klinikalarni qidirish'}
🌐 - ${session.language === 'ru' ? 'Изменить язык' : 'Tilni o\'zgartirish'}`;

    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: t('sendLocation', session) }],
          [{ text: t('changeLanguage', session) }],
          [{ text: '❓ ' + t('help', session) }],
          ...(chatId === ADMIN_ID ? [[{ text: t('adminPanel', session) }]] : [])
        ],
        resize_keyboard: true
      }
    };

    bot.sendMessage(chatId, helpMessage, keyboard);
  }
};