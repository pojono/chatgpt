import type { openai, FetchFn } from 'chatgpt';

export interface BotOptions {
  token: string;
  userIds: number[];
  groupIds: number[];
  chatCmd: string;
  queue: boolean;
}

export interface APIOfficialOptions {
  apiKey: string;
  apiBaseUrl?: string;
  completionParams?: Partial<
    Omit<openai.CreateChatCompletionRequest, 'messages' | 'n'>
  >;
  systemMessage?: string;
  maxModelTokens?: number;
  maxResponseTokens?: number;
  timeoutMs?: number;
  fetch?: FetchFn;
  debug?: boolean;
}

export interface APIOptions {
  type: 'official' | string;
  official: APIOfficialOptions;
}

export interface Config {
  debug: number;
  version: string;
  ownerId?: number;
  bot: BotOptions;
  api: APIOptions;
  proxy?: string;
}
