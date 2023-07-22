import { tryGet } from './try.get.js';

export function botNames(): string[] {
  const env = process.env.BOT_NAME;
  if (env) {
    return [env];
  }
  return tryGet<string[]>('bot.names') ?? [];
}
