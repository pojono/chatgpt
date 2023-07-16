import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../types';

export async function start(bot: TelegramBot, options: Config): Promise<void> {
  if (!options.ownerId) {
    return;
  }
  await bot.sendMessage(
    options.ownerId,
    `🔮 ChatGPT has started! Version: ${options.version}`,
  );
}
