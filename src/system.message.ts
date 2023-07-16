import { tryGet } from './try.get';

export function systemMessage(): string | undefined {
  return tryGet<string>('bot.message');
}
