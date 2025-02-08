import TelegramBot from 'node-telegram-bot-api';
import { config } from 'dotenv';
import express from "express";
import { BOT_TOKEN } from './config';
import { commandHandlers } from './handlers/commandHandlers';
import { adminHandlers } from './handlers/adminHandlers';
import { locationHandlers } from './handlers/locationHandlers';
import { languageHandlers } from './handlers/languageHandlers';
import { catalogHandlers } from './handlers/catalogHandlers';
import { callbackHandlers } from './handlers/callbackHandlers';


config();

const PORT = process.env.PORT || 3000; // Fly.io 3000-portni kutadi
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});

let bot: TelegramBot | null = null;
let isReconnecting = false;
let reconnectAttempts = 0;
let healthCheckInterval: NodeJS.Timeout | null = null;
let lastHealthCheckSuccess = Date.now();
let lastPollingError = 0;
const ERROR_THRESHOLD = 2000; // Reduced from 5000ms to be more responsive

const MAX_RECONNECT_ATTEMPTS = 50; // Increased from 30
const INITIAL_RECONNECT_DELAY = 50; // Further reduced initial delay
const MAX_RECONNECT_DELAY = 3000; // Further reduced max delay
const HEALTH_CHECK_INTERVAL = 2000; // More frequent health checks
const CONNECTION_TIMEOUT = 3000; // Reduced connection timeout
const POLLING_INTERVAL = 100; // More frequent polling
const SOCKET_TIMEOUT = 5000; // Reduced socket timeout
const HEALTH_CHECK_THRESHOLD = 10000; // Reduced threshold
const MAX_RETRIES = 5; // Increased from 3

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBotHealth() {
  if (!bot || isReconnecting) return;
  
  if (Date.now() - lastHealthCheckSuccess > HEALTH_CHECK_THRESHOLD) {
    console.log('Health check threshold exceeded, forcing reconnect...');
    await reconnectBot();
    return;
  }
  
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), SOCKET_TIMEOUT);
    });
    
    await Promise.race([bot.getMe(), timeoutPromise]);
    lastHealthCheckSuccess = Date.now();
  } catch (error) {
    console.log('Health check failed:', error.message);
    if (error.message.includes('ESOCKETTIMEDOUT') || error.message.includes('timeout')) {
      console.log('Socket timeout detected, forcing immediate reconnect...');
      await reconnectBot();
    }
  }
}

async function cleanupBot() {
  if (!bot) return;

  try {
    console.log('Stopping polling...');
    await Promise.race([
      bot.stopPolling(),
      new Promise(resolve => setTimeout(resolve, 1000)) // Reduced timeout
    ]);
  } catch (error) {
    console.error('Error stopping polling:', error);
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  bot.removeAllListeners();
  
  try {
    // @ts-ignore - Access internal _polling property
    if (bot._polling) {
      // @ts-ignore
      bot._polling = false;
    }
  } catch (error) {
    console.error('Error clearing bot state:', error);
  }
}

async function reconnectBot() {
  if (isReconnecting || Date.now() - lastPollingError < ERROR_THRESHOLD) return;
  
  isReconnecting = true;
  lastPollingError = Date.now();
  console.log('Starting reconnection process...');
  
  try {
    await cleanupBot();
    bot = null;
  } catch (error) {
    console.error('Error cleaning up existing bot:', error);
  }

  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(1.3, reconnectAttempts), // Reduced exponential factor
    MAX_RECONNECT_DELAY
  );

  console.log(`Waiting ${delay/1000} seconds before reconnect (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
  
  await sleep(delay);
  
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('Max reconnection attempts reached, resetting...');
    reconnectAttempts = 0;
    await sleep(MAX_RECONNECT_DELAY);
  } else {
    reconnectAttempts++;
  }
  
  isReconnecting = false;
  await createBot();
}

async function createBot() {
  try {
    console.log('Creating new bot instance...');
    
    const requestOptions = {
      timeout: CONNECTION_TIMEOUT,
      forever: true,
      pool: { 
        maxSockets: 25, // Further reduced
        maxFreeSockets: 5,
        timeout: SOCKET_TIMEOUT
      },
      agent: false,
      keepAlive: true,
      keepAliveMsecs: 10000, // Reduced keep-alive
      rejectUnauthorized: false,
      socketTimeout: SOCKET_TIMEOUT,
      proxy: false,
      gzip: true,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'TibXizmatBot/1.0',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=10, max=50' // Reduced timeout and max
      }
    };

    bot = new TelegramBot(BOT_TOKEN, {
      polling: {
        interval: POLLING_INTERVAL,
        autoStart: true,
        params: {
          timeout: 10, // Reduced timeout
          allowed_updates: ['message', 'callback_query', 'edited_message']
        }
      },
      request: requestOptions,
      baseApiUrl: 'https://api.telegram.org',
      webHook: false
    });

    // Command handlers
    bot.onText(/\/start/, (msg) => commandHandlers.handleStart(bot!, msg));
    bot.onText(/\/help/, (msg) => commandHandlers.handleHelp(bot!, msg));
    bot.onText(/❓.*/, (msg) => commandHandlers.handleHelp(bot!, msg));
    bot.onText(/\/catalog/, (msg) => catalogHandlers.handleCatalog(bot!, msg));

    // Admin panel handlers
    bot.onText(/⚙️.*/, (msg) => adminHandlers.handleAdminPanel(bot!, msg));
    bot.onText(/📊.*/, (msg) => adminHandlers.handleStats(bot!, msg));
    bot.onText(/📢.*/, (msg) => adminHandlers.handleBroadcast(bot!, msg));
    bot.onText(/🏥.*/, (msg) => adminHandlers.handleClinicsList(bot!, msg));
    bot.onText(/➕.*/, (msg) => adminHandlers.handleAddClinic(bot!, msg));
    bot.onText(/⬅️.*/, (msg) => adminHandlers.handleBack(bot!, msg));

    // Location handlers
    bot.onText(/📍.*/, (msg) => locationHandlers.handleLocationButton(bot!, msg));
    bot.on('location', (msg) => locationHandlers.handleLocation(bot!, msg));

    // Language handlers
    bot.onText(/🌐.*/, (msg) => languageHandlers.handleLanguageButton(bot!, msg));

    // Callback handlers with retry and timeout
    bot.on('callback_query', async (query) => {
      let retries = MAX_RETRIES;
      while (retries > 0) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Callback timeout')), SOCKET_TIMEOUT);
          });
          
          await Promise.race([
            callbackHandlers.handleCallback(bot!, query),
            timeoutPromise
          ]);
          break;
        } catch (error) {
          console.error(`Callback error (retries left: ${retries}):`, error);
          retries--;
          if (retries === 0) {
            try {
              await bot!.answerCallbackQuery(query.id);
            } catch (err) {
              console.error('Error answering callback query:', err);
            }
          } else {
            await sleep(500); // Reduced retry delay
          }
        }
      }
    });

    // Text message handler with retries and timeout
    bot.on('text', async (msg) => {
      if (/^\/|📊|📢|🏥|➕|⬅️|⚙️|📍|🌐/.test(msg.text)) {
        return;
      }
      
      let retries = MAX_RETRIES;
      while (retries > 0) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Message handling timeout')), SOCKET_TIMEOUT);
          });
          
          await Promise.race([
            Promise.all([
              adminHandlers.handleClinicSelection(bot!, msg),
              adminHandlers.handleClinicInput(bot!, msg)
            ]),
            timeoutPromise
          ]);
          break;
        } catch (error) {
          console.error(`Message handling error (retries left: ${retries}):`, error);
          retries--;
          if (retries === 0) {
            try {
              await bot!.sendMessage(msg.chat.id, 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
            } catch (err) {
              console.error('Error sending error message:', err);
            }
          } else {
            await sleep(500); // Reduced retry delay
          }
        }
      }
    });

    // Enhanced error handling with rate limiting
    bot.on('polling_error', async (error) => {
      console.error('Polling error:', error.message);
      
      const networkErrors = [
        'ETELEGRAM',
        'EFATAL',
        'socket hang up',
        'ETIMEDOUT',
        'ESOCKETTIMEDOUT',
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'read ECONNRESET',
        'connect ETIMEDOUT',
        'network timeout',
        'ECONNABORTED',
        'EPROTO',
        'EINVAL'
      ];

      if (networkErrors.some(e => error.message.includes(e))) {
        await reconnectBot();
      }
    });

    bot.on('error', async (error) => {
      console.error('Bot error:', error.message);
      await reconnectBot();
    });

    // Connection management
    bot.on('polling_started', () => {
      console.log('Bot polling started successfully');
      reconnectAttempts = 0;
      isReconnecting = false;
      lastHealthCheckSuccess = Date.now();
      
      if (!healthCheckInterval) {
        healthCheckInterval = setInterval(checkBotHealth, HEALTH_CHECK_INTERVAL);
      }
    });

    bot.on('polling_stopped', () => {
      console.log('Bot polling stopped');
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    });

    return bot;
  } catch (error) {
    console.error('Error creating bot:', error);
    await reconnectBot();
    return null;
  }
}

// Start the bot
createBot();

// Global error handlers with improved debouncing
let errorHandlerTimeout: NodeJS.Timeout | null = null;
const handleGlobalError = async (error: Error, source: string) => {
  console.error(`${source}:`, error);
  
  if (errorHandlerTimeout) {
    clearTimeout(errorHandlerTimeout);
  }
  
  errorHandlerTimeout = setTimeout(async () => {
    await reconnectBot();
    errorHandlerTimeout = null;
  }, 500); // Reduced debounce delay
};

process.on('unhandledRejection', (error) => {
  handleGlobalError(error as Error, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  handleGlobalError(error, 'Uncaught exception');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Gracefully shutting down...');
  
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  if (bot) {
    try {
      await cleanupBot();
      console.log('Bot cleanup completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
});

console.log('Bot is running with enhanced connection handling...');