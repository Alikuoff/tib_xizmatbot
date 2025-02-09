import TelegramBot from 'node-telegram-bot-api';
import { sessionService } from '../services/sessionService';
import { clinicService } from '../services/clinicService';
import { t } from '../utils/translation';
import { ADMIN_ID } from '../config';

export const locationHandlers = {
  handleLocationButton: (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: t('sendLocation', session), request_location: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    };

    bot.sendMessage(chatId, t('shareLocation', session), keyboard);
  },

  handleLocation: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    if (!msg.location) return;
    
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId === ADMIN_ID && session.step === 'waiting_clinic_location' && session.tempData?.newClinic) {
      const newClinic = {
        id: `clinic${Date.now()}`,
        name: session.tempData.newClinic.name!,
        district: session.tempData.newClinic.district!,
        location: {
          latitude: msg.location.latitude,
          longitude: msg.location.longitude
        },
        phone: session.tempData.newClinic.phone!,
        website: session.tempData.newClinic.website!,
        workingHours: session.tempData.newClinic.workingHours!,
        services: []
      };

      clinicService.add(newClinic);

      session.step = 'idle';
      session.tempData = undefined;
      sessionService.update(chatId, session);

      const keyboard = {
        reply_markup: {
          keyboard: [
            [{ text: '➕ ' + t('addClinic', session) }],
            ...clinicService.getAll().map(clinic => ([{ text: clinic.name }])),
            [{ text: t('back', session) }]
          ],
          resize_keyboard: true
        }
      };

      await bot.sendMessage(chatId, t('clinicAdded', session), keyboard);
    } else {
      session.lastLocation = {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude
      };
      sessionService.update(chatId, session);

      const nearestClinics = clinicService.findNearestClinics(msg.location.latitude, msg.location.longitude);
      
      let message = session.language === 'ru' ? 'Ближайшие клиники:\n\n' : 'Eng yaqin klinikalar:\n\n';
      nearestClinics.forEach((clinic, index) => {
        message += `${index + 1}. ${clinic.name}\n`;
        message += `📍 ${session.language === 'ru' ? 'Расстояние' : 'Masofa'}: ${clinic.distance.toFixed(1)} ${session.language === 'ru' ? 'км' : 'km'}\n`;
        message += `📞 ${clinic.phone}\n`; // Added phone number
        message += `🌐 ${clinic.website || t('noWebsite', session)}\n\n`;
      });

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

      await bot.sendMessage(chatId, message, keyboard);
    }
  }
};