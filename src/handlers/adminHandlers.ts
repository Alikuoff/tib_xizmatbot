import TelegramBot from 'node-telegram-bot-api';
import { sessionService } from '../services/sessionService';
import { clinicService } from '../services/clinicService';
import { districtService } from '../services/districtService';
import { t } from '../utils/translation';
import { ADMIN_ID } from '../config';

export const adminHandlers = {
  handleAdminPanel: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) {
      await bot.sendMessage(chatId, t('notAuthorized', session));
      return;
    }

    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: '📊 ' + t('adminStats', session) }],
          [{ text: '📢 ' + t('adminBroadcast', session) }],
          [{ text: '🏥 ' + t('adminClinicsList', session) }],
          [{ text: t('back', session) }]
        ],
        resize_keyboard: true
      }
    };

    await bot.sendMessage(chatId, t('adminPanelWelcome', session), keyboard);
  },

  handleStats: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) return;

    const totalUsers = sessionService.getSize();
    const activeUsers = sessionService.getActiveUsers();
    const subscribedUsers = sessionService.getSubscribedUsers();

    const statsMessage = `📊 ${session.language === 'ru' ? 'Статистика' : 'Statistika'}:\n\n` +
      `${t('totalUsers', session)}: ${totalUsers}\n` +
      `${t('activeUsers', session)}: ${activeUsers}\n` +
      `${t('subscribedUsers', session)}: ${subscribedUsers}`;

    await bot.sendMessage(chatId, statsMessage);
  },

  handleBroadcast: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) return;

    session.step = 'waiting_broadcast';
    sessionService.update(chatId, session);

    await bot.sendMessage(chatId, t('enterBroadcastMessage', session));
  },

  handleClinicsList: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) return;

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

    await bot.sendMessage(chatId, t('clinicManagement', session), keyboard);
  },

  handleAddClinic: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) return;

    session.step = 'waiting_clinic_name';
    session.tempData = { newClinic: {} };
    sessionService.update(chatId, session);
    await bot.sendMessage(chatId, t('enterClinicName', session));
  },

  handleClinicSelection: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) return;

    const clinic = clinicService.findByName(msg.text);
    if (clinic) {
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '➕ ' + t('addService', session), callback_data: `add_service_${clinic.id}` },
              { text: '🗑️ ' + t('deleteClinic', session), callback_data: `delete_clinic_${clinic.id}` }
            ]
          ]
        }
      };

      session.tempData = { clinicId: clinic.id };
      sessionService.update(chatId, session);

      let message = `${t('manageClinic', session)}\n\n`;
      message += `🏥 ${clinic.name}\n`;
      message += `📍 ${districtService.getDistrictName(clinic.district, session.language)}\n`;
      message += `📞 ${clinic.phone || 'Mavjud emas'}\n`;
      message += `🕒 ${clinic.workingHours}\n`;
      message += `🌐 ${clinic.website || t('noWebsite', session)}`;

      if (clinic.services && clinic.services.length > 0) {
        message += `\n\n${t('services', session)}:\n`;
        clinic.services.forEach((service, index) => {
          message += `${index + 1}. ${service.name[session.language]} - ${service.price} ${t('currency', session)}\n`;
        });
      }

      await bot.sendMessage(chatId, message, keyboard);
    }
  },

  handleClinicInput: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) return;

    switch (session.step) {
      case 'waiting_clinic_name':
        if (session.tempData?.newClinic) {
          session.tempData.newClinic.name = msg.text;
          session.step = 'waiting_clinic_phone';
          sessionService.update(chatId, session);
          await bot.sendMessage(chatId, t('enterClinicPhone', session));
        }
        break;

      case 'waiting_clinic_phone':
        if (session.tempData?.newClinic) {
          session.tempData.newClinic.phone = msg.text;
          session.step = 'waiting_clinic_district';
          sessionService.update(chatId, session);
          
          const districtKeyboard = {
            reply_markup: {
              keyboard: districtService.getAll().map(d => ([{ text: d.name[session.language] }])),
              resize_keyboard: true
            }
          };
          
          await bot.sendMessage(chatId, t('selectClinicDistrict', session), districtKeyboard);
        }
        break;

      case 'waiting_clinic_district':
        if (session.tempData?.newClinic) {
          const district = districtService.findByName(msg.text, session.language);
          if (district) {
            session.tempData.newClinic.district = district.id;
            session.step = 'waiting_clinic_website';
            sessionService.update(chatId, session);
            
            const keyboard = {
              reply_markup: {
                keyboard: [
                  [{ text: t('noWebsite', session) }],
                  [{ text: t('back', session) }]
                ],
                resize_keyboard: true
              }
            };
            
            await bot.sendMessage(chatId, t('enterClinicWebsite', session), keyboard);
          }
        }
        break;

      case 'waiting_clinic_website':
        if (session.tempData?.newClinic) {
          session.tempData.newClinic.website = msg.text === t('noWebsite', session) ? '' : msg.text;
          session.step = 'waiting_clinic_hours';
          sessionService.update(chatId, session);
          await bot.sendMessage(chatId, t('enterClinicHours', session));
        }
        break;

      case 'waiting_clinic_hours':
        if (session.tempData?.newClinic) {
          session.tempData.newClinic.workingHours = msg.text;
          session.step = 'waiting_clinic_location';
          sessionService.update(chatId, session);
          
          const locationKeyboard = {
            reply_markup: {
              keyboard: [[{ text: '📍', request_location: true }]],
              resize_keyboard: true
            }
          };
          
          await bot.sendMessage(chatId, t('shareClinicLocation', session), locationKeyboard);
        }
        break;

      case 'waiting_service_name_ru':
        if (session.tempData?.newService) {
          session.tempData.newService.name = { ru: msg.text, uz: '' };
          session.step = 'waiting_service_name_uz';
          sessionService.update(chatId, session);
          await bot.sendMessage(chatId, t('enterServiceNameUz', session));
        }
        break;

      case 'waiting_service_name_uz':
        if (session.tempData?.newService && session.tempData.newService.name) {
          session.tempData.newService.name.uz = msg.text;
          session.step = 'waiting_service_price';
          sessionService.update(chatId, session);
          await bot.sendMessage(chatId, t('enterServicePrice', session));
        }
        break;

      case 'waiting_service_price':
        if (session.tempData?.newService && session.tempData.clinicId) {
          const price = parseInt(msg.text);
          if (isNaN(price)) {
            await bot.sendMessage(chatId, t('invalidPrice', session));
            return;
          }

          const clinic = clinicService.findById(session.tempData.clinicId);
          if (clinic && session.tempData.newService.name) {
            const newService = {
              id: `service${Date.now()}`,
              name: session.tempData.newService.name,
              price: price
            };

            if (!clinic.services) {
              clinic.services = [];
            }
            clinic.services.push(newService);
            clinicService.update(clinic);

            session.step = 'idle';
            session.tempData = undefined;
            sessionService.update(chatId, session);

            // Show updated clinic info
            const keyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '➕ ' + t('addService', session), callback_data: `add_service_${clinic.id}` },
                    { text: '🗑️ ' + t('deleteClinic', session), callback_data: `delete_clinic_${clinic.id}` }
                  ]
                ]
              }
            };

            let message = `${t('manageClinic', session)}\n\n`;
            message += `🏥 ${clinic.name}\n`;
            message += `📍 ${districtService.getDistrictName(clinic.district, session.language)}\n`;
            message += `📞 ${clinic.phone || 'Mavjud emas'}\n`;
            message += `🕒 ${clinic.workingHours}\n`;
            message += `🌐 ${clinic.website || t('noWebsite', session)}`;

            if (clinic.services.length > 0) {
              message += `\n\n${t('services', session)}:\n`;
              clinic.services.forEach((service, index) => {
                message += `${index + 1}. ${service.name[session.language]} - ${service.price} ${t('currency', session)}\n`;
              });
            }

            await bot.sendMessage(chatId, t('serviceAdded', session));
            await bot.sendMessage(chatId, message, keyboard);
          }
        }
        break;

      case 'waiting_broadcast':
        const users = sessionService.getAll().map(([id]) => id);
        for (const userId of users) {
          try {
            await bot.sendMessage(userId, msg.text);
          } catch (error) {
            console.error(`Failed to send broadcast to user ${userId}:`, error);
          }
        }

        session.step = 'idle';
        sessionService.update(chatId, session);
        await bot.sendMessage(chatId, t('broadcastSent', session));
        break;
    }

    sessionService.update(chatId, session);
  },

  handleBack: async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const session = sessionService.get(chatId) || sessionService.init(chatId);

    if (chatId !== ADMIN_ID) return;

    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: t('sendLocation', session) }],
          [{ text: t('changeLanguage', session) }],
          [{ text: t('help', session) }],
          [{ text: t('adminPanel', session) }]
        ],
        resize_keyboard: true
      }
    };

    session.step = 'idle';
    session.tempData = undefined;
    sessionService.update(chatId, session);

    await bot.sendMessage(chatId, t('welcome', session), keyboard);
  }
};