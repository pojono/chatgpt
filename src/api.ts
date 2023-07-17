import type {
  ChatGPTAPI as ChatGPTAPIType,
  ChatMessage as ChatResponseV4,
} from 'chatgpt';
import { APIOfficialOptions, APIOptions } from './types';
import { logWithTime } from './utils';
import { DB } from './db';
import { SendMessageOptions } from 'chatgpt';
import TelegramBot from 'node-telegram-bot-api';
import { systemMessage } from './lib/system.message';

const { ChatGPTAPI } = await import('chatgpt');

class ChatGPT {
  debug: number;
  protected _opts: APIOptions;
  protected _apiOfficial: ChatGPTAPIType;
  protected _timeoutMs: number | undefined;
  protected _db: DB;

  constructor(apiOpts: APIOptions, db: DB, debug = 1) {
    this.debug = debug;
    this._opts = apiOpts;
    this._timeoutMs = undefined;
    this._db = db;
    this._apiOfficial = new ChatGPTAPI(
      this._opts.official as APIOfficialOptions,
    );
    this._timeoutMs = this._opts.official?.timeoutMs;
  }

  init = async () => {
    logWithTime('🔮 ChatGPT API has started...');
  };

  sendMessage = async (
    msg: TelegramBot.Message,
    text: string,
    chatId: number,
    onProgress?: (res: ChatResponseV4) => void,
  ): Promise<ChatResponseV4> => {
    const userId = msg.from?.id ?? 0;

    const contextDB = await this._db.getContext(chatId, userId);

    const context: SendMessageOptions = {
      name: msg?.from?.first_name,
      conversationId: contextDB?.conversationId || userId.toString(),
      parentMessageId: contextDB?.parentMessageId,
      systemMessage: systemMessage(),
    };

    const res: ChatResponseV4 = await this._apiOfficial.sendMessage(text, {
      ...context,
      onProgress,
      timeoutMs: this._timeoutMs,
    });

    const parentMessageId = res.id;

    await this._db.updateContext(chatId, userId, {
      conversationId: res.conversationId,
      parentMessageId,
    });

    return res;
  };

  resetThread = async (chatId: number, userId: number) => {
    await this._db.clearContext(chatId, userId);
  };
}

export { ChatGPT };
