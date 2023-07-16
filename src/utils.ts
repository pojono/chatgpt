import type { openai } from 'chatgpt';
import config from 'config';
import { Config, APIOfficialOptions } from './types';
import { tryGet } from './lib/try.get';

function loadConfig(): Config {
  const apiType = 'official';
  const apiOfficialCfg: APIOfficialOptions = {
    apiKey:
      process.env['OPENAI_API_KEY'] ||
      config.get<string>('api.official.apiKey'),
    apiBaseUrl: tryGet<string>('api.official.apiBaseUrl') || undefined,
    completionParams:
      tryGet<
        Partial<Omit<openai.CreateChatCompletionRequest, 'messages' | 'n'>>
      >('api.official.completionParams') || undefined,
    systemMessage: tryGet<string>('api.official.systemMessage') || undefined,
    maxModelTokens: tryGet<number>('api.official.maxModelTokens') || undefined,
    maxResponseTokens:
      tryGet<number>('api.official.maxResponseTokens') || undefined,
    timeoutMs: tryGet<number>('api.official.timeoutMs') || undefined,
    debug: (tryGet<number>('debug') || 1) >= 2,
  };

  return {
    debug: tryGet<number>('debug') || 1,
    version: process.env['DOCKER_TAG'] || 'local',
    bot: {
      token:
        process.env['TELEGRAM_BOT_TOKEN'] || config.get<string>('bot.token'),
      ownerId:
        Number(process.env['OWNER_ID']) || tryGet<number>('ownerId') || 0,
      userIds: tryGet<number[]>('bot.userIds') || [],
      groupIds: tryGet<number[]>('bot.groupIds') || [],
      chatCmd: tryGet<string>('bot.chatCmd') || '/chat',
      queue: tryGet<boolean>('bot.queue') ?? true,
    },
    api: {
      type: apiType,
      official: apiOfficialCfg,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logWithTime(...args: any[]) {
  console.log(new Date().toLocaleString(), ...args);
}

export { loadConfig, logWithTime };
