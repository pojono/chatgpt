import type {
  ChatGPTAPI as ChatGPTAPIType,
  ChatMessage as ChatResponseV4,
} from 'chatgpt';
import { SendMessageOptions } from 'chatgpt';
import { APIOptions } from './types.d.js';
import { logWithTime } from './utils.js';
import { DB } from './db.js';
import TelegramBot from 'node-telegram-bot-api';
import { getUserName } from './lib/get.user.name.js';

const { ChatGPTAPI } = await import('chatgpt');

class ChatGPT {
  debug: number;
  protected _opts: APIOptions;
  protected _openAI: ChatGPTAPIType;
  protected _timeoutMs: number | undefined;
  protected _db: DB;
  protected _prompt: string;

  constructor(apiOpts: APIOptions, db: DB, prompt: string, debug = 1) {
    this.debug = debug;
    this._opts = apiOpts;
    this._timeoutMs = undefined;
    this._db = db;
    this._prompt = prompt;
    this._openAI = new ChatGPTAPI(this._opts.official);
    this._timeoutMs = this._opts.official.timeoutMs;
  }

  init = () => {
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
      name: getUserName(msg),
      conversationId: contextDB?.conversationId || userId.toString(),
      parentMessageId: contextDB?.parentMessageId,
      systemMessage: this._prompt,
    };

    const res: ChatResponseV4 = await this._openAI.sendMessage(text, {
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

  resetAllThreads = async () => {
    await this._db.clearAllContexts();
  };

  updateSystemMessage = (message: string) => {
    this._prompt = message;
  };
}

export { ChatGPT };
