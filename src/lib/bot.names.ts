import { tryGet } from './try.get';

export function botNames(): string[] {
  return tryGet<string[]>('bot.names') || [];
}
