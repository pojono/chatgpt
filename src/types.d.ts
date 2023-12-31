import type { openai, FetchFn } from 'chatgpt';

export interface BotOptions {
  token: string;
  ownerId: number;
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
  maxModelTokens?: number;
  maxResponseTokens?: number;
  timeoutMs?: number;
  fetch?: FetchFn;
  debug?: boolean;
}

export interface APIOptions {
  official: APIOfficialOptions;
}

export interface Config {
  debug: number;
  version: string;
  bot: BotOptions;
  api: APIOptions;
  proxy?: string;
}
