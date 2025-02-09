import TelegramBot from 'node-telegram-bot-api';
import { sessionService } from '../services/sessionService';
import { clinicService } from '../services/clinicService';
import { districtService } from '../services/districtService';
import { t } from '../utils/translation';
import { languageHandlers } from './languageHandlers';
import { handleNextClinic } from './catalogHandlers';

export const callbackHandlers = {
  handleCallback: async (bot: TelegramBot, query: TelegramBot.CallbackQuery) => {
    if (!query.message || !query.data) return;

    const chatId = query.message.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (query.data.startsWith('lang_')) {
      const lang = query.data.replace('lang_', '') as 'ru' | 'uz';
      await languageHandlers.handleLanguageChange(bot, chatId, lang);
    } else if (query.data === 'nearest') {
      if (!session.lastLocation) {
        await bot.sendMessage(chatId, t('noLocation', session));
        return;
      }
      
      const nearestClinics = clinicService.findNearestClinics(
        session.lastLocation.latitude,
        session.lastLocation.longitude
      );
      
      let message = session.language === 'ru' ? 'Ближайшие клиники:\n\n' : 'Eng yaqin klinikalar:\n\n';
      nearestClinics.forEach((clinic, index) => {
        message += `${index + 1}. ${clinic.name}\n`;
        message += `📍 ${session.language === 'ru' ? 'Расстояние' : 'Masofa'}: ${clinic.distance.toFixed(1)} ${session.language === 'ru' ? 'км' : 'km'}\n`;
        message += `🌐 ${clinic.website || t('noWebsite', session)}\n\n`;
      });
      
      await bot.sendMessage(chatId, message);
    } else if (query.data === 'cheapest') {
      const allServices = clinicService.getAllServices();
      const sortedByPrice = [...allServices].sort((a, b) => a.service.price - b.service.price);
      const cheapestServices = sortedByPrice.slice(0, 5);

      let message = t('cheapestServices', session) + '\n\n';
      cheapestServices.forEach(({ clinic, service }, index) => {
        message += `${index + 1}. ${clinic.name} - ${service.name[session.language]}\n`;
        message += `💰 ${service.price} ${t('currency', session)}\n`;
        message += `🌐 ${clinic.website || t('noWebsite', session)}\n\n`;
      });

      await bot.sendMessage(chatId, message);
    } else if (query.data === 'next_clinic') {
      await handleNextClinic(bot, chatId, session);
    } else if (query.data.startsWith('delete_clinic_')) {
      const clinicId = query.data.replace('delete_clinic_', '');
      
      try {
        clinicService.delete(clinicId);
        
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

        session.tempData = undefined;
        session.step = 'idle';
        sessionService.update(chatId, session);

        await bot.editMessageText(t('clinicDeleted', session), {
          chat_id: chatId,
          message_id: query.message.message_id
        });
        
        await bot.sendMessage(chatId, t('clinicManagement', session), keyboard);
      } catch (error) {
        console.error('Error deleting clinic:', error);
        await bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    } else if (query.data.startsWith('add_service_')) {
      const clinicId = query.data.replace('add_service_', '');
      const clinic = clinicService.findById(clinicId);
      
      if (clinic) {
        session.step = 'waiting_service_name_ru';
        session.tempData = { 
          clinicId,
          newService: {}
        };
        sessionService.update(chatId, session);
        
        await bot.sendMessage(chatId, t('enterServiceNameRu', session));
      }
    }

    try {
      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('Error answering callback query:', error);
    }
  }
};