import TelegramBot from 'node-telegram-bot-api';
import { ChatGPT } from './api';
import { MessageHandler } from './handlers/message';
import { loadConfig } from './utils';
import { DB } from './db';
import { start } from './lib/start';
import { getPrompts } from './lib/get.prompts';
import { getDefaultPrompt } from './lib/get.default.prompt';

async function main() {
  console.log('🔮 ChatGPT Telegram Bot is starting...');

  const prompts = getPrompts();
  const opts = loadConfig();
  const db = new DB();

  const api = new ChatGPT(opts.api, db, getDefaultPrompt(prompts), opts.debug);
  await api.init();

  const bot = new TelegramBot(opts.bot.token, {
    polling: true,
  });
  const messageHandler = new MessageHandler(
    bot,
    api,
    opts.bot,
    db,
    prompts,
    opts.debug,
  );
  await messageHandler.init();

  bot.on('message', messageHandler.handle);

  await start(bot, opts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
