import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../types.js';

export async function start(bot: TelegramBot, options: Config): Promise<void> {
  await bot.sendMessage(
    options.bot.ownerId,
    `🔮 ChatGPT has started! Version: ${options.version} debug=${options.debug}`,
  );
}
