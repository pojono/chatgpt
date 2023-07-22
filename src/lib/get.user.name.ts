import { transliterate } from './transliterate.js';
import { sanitize } from './sanitize.js';
import TelegramBot from 'node-telegram-bot-api';

export function getUserName(msg: TelegramBot.Message): string | undefined {
  return sanitize(transliterate(msg?.from?.first_name || ''));
}
