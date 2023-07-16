import { tryGet } from './try.get';

export function systemMessage(): string | undefined {
  return process.env['SYSTEM_MESSAGE'] || tryGet<string>('bot.message');
}
