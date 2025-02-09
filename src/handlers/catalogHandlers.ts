import TelegramBot from 'node-telegram-bot-api';
import { sessionService } from '../services/sessionService';
import { clinicService } from '../services/clinicService';
import { districtService } from '../services/districtService';
import { t } from '../utils/translation';

export const catalogHandlers = {
  handleCatalog: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);
    
    const allClinics = clinicService.getAll();
    
    if (allClinics.length === 0) {
      await bot.sendMessage(chatId, session.language === 'ru' ? 'Клиники не найдены' : 'Klinikalar topilmadi');
      return;
    }
    
    // Initialize or reset clinic index in session
    if (!session.tempData) {
      session.tempData = {};
    }
    session.tempData.currentClinicIndex = 0;
    sessionService.update(chatId, session);

    // First show the main catalog message with buttons
    const mainKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t('nearest', session), callback_data: 'nearest' },
            { text: t('cheapest', session), callback_data: 'cheapest' }
          ]
        ]
      }
    };

    await bot.sendMessage(chatId, t('catalog', session), mainKeyboard);

    // Then show the first clinic
    await showClinic(bot, chatId, session, allClinics[0]);
  }
};

async function showClinic(bot: TelegramBot, chatId: number, session: any, clinic: any) {
  const allClinics = clinicService.getAll();
  const currentIndex = session.tempData?.currentClinicIndex || 0;
  
  let message = `🏥 ${clinic.name}\n`;
  message += `📍 ${districtService.getDistrictName(clinic.district, session.language)}\n`;
  message += `📞 ${clinic.phone || t('noPhone', session)}\n`;
  message += `🕒 ${clinic.workingHours}\n`;
  message += `🌐 ${clinic.website || t('noWebsite', session)}`;
  
  if (clinic.services && clinic.services.length > 0) {
    message += `\n\n${t('services', session)}:\n`;
    clinic.services.forEach((service: any) => {
      message += `- ${service.name[session.language]}: ${service.price} ${t('currency', session)}\n`;
    });
  } else {
    message += `\n\n${t('noServices', session)}`;
  }

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: t('nextClinic', session), callback_data: 'next_clinic' }]
      ]
    }
  };

  try {
    await bot.sendMessage(chatId, message, keyboard);
  } catch (error) {
    console.error('Error sending clinic message:', error);
    await bot.sendMessage(chatId, session.language === 'ru' ? 'Произошла ошибка. Попробуйте еще раз.' : 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
  }
}

export const handleNextClinic = async (bot: TelegramBot, chatId: number, session: any) => {
  const allClinics = clinicService.getAll();
  
  if (!session.tempData) {
    session.tempData = { currentClinicIndex: 0 };
  }
  
  let nextIndex = (session.tempData.currentClinicIndex || 0) + 1;
  if (nextIndex >= allClinics.length) {
    nextIndex = 0;
  }
  
  session.tempData.currentClinicIndex = nextIndex;
  sessionService.update(chatId, session);
  
  await showClinic(bot, chatId, session, allClinics[nextIndex]);
};