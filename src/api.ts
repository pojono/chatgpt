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
import {
  extractTextWithinSquareBrackets,
  getTextAfterBracket,
} from './lib/message.extractors.js';

const { ChatGPTAPI } = await import('chatgpt');

class ChatGPT {
  debug: number;
  protected _opts: APIOptions;
  protected _openAI: ChatGPTAPIType;
  protected _timeoutMs: number | undefined;
  protected _db: DB;
  protected _prompt: string;
  public _instruction: string;

  constructor(apiOpts: APIOptions, db: DB, prompt: string, debug = 1) {
    this.debug = debug;
    this._opts = apiOpts;
    this._timeoutMs = undefined;
    this._db = db;
    this._prompt = this.getPromptWithoutInstruction(prompt);
    this._instruction = this.getInstruction(prompt);
    this._openAI = new ChatGPTAPI(this._opts.official);
    this._timeoutMs = this._opts.official.timeoutMs;
  }

  init = () => {
    logWithTime('🔮 ChatGPT API has started...');
  };

  getPromptWithoutInstruction(prompt: string): string {
    return getTextAfterBracket(prompt).trim();
  }

  getInstruction(prompt: string): string {
    return extractTextWithinSquareBrackets(prompt).trim();
  }

  addInstructionToMessage = (message: string): string => {
    return message.trim();
    /*
    if (this._instruction.length > 0 && Math.random() >= 0) {
      return `{${message.trim()}} [${this._instruction}]`;
    }
    return `{${message.trim()}}`;
    */
  };

  sendMessage = async (
    msg: TelegramBot.Message,
    text: string,
    chatId: number,
    onProgress?: (res: ChatResponseV4) => void,
  ): Promise<ChatResponseV4> => {
    const userId = msg.from?.id ?? 0;

    const contextDB = this._db.getContext(chatId, userId);

    const context: SendMessageOptions = {
      name: getUserName(msg),
      conversationId: contextDB?.conversationId ?? userId.toString(),
      parentMessageId: contextDB?.parentMessageId,
      systemMessage: this._prompt,
    };

    const message = this.addInstructionToMessage(text);

    const res: ChatResponseV4 = await this._openAI.sendMessage(message, {
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

  updateSystemMessage = (message: string): void => {
    this._prompt = this.getPromptWithoutInstruction(message);
    this._instruction = this.getInstruction(message);
  };

  protected async downloadFile(fileUrl: string): Promise<Buffer> {
    const response = await fetch(fileUrl);
    return Buffer.from(await response.arrayBuffer());
  }

  transcribeAudio = async (fileUrl: string): Promise<string> => {
    try {
      const audioData = await this.downloadFile(fileUrl);

      const formData = new FormData();
      const blob = new Blob([audioData], { type: 'audio/ogg' });
      formData.append('file', blob, 'audio.ogg');
      formData.append('model', 'whisper-1');

      const response = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this._opts.official.apiKey}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Transcription failed with status ${response.status}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
      return result.text;
    } catch (error) {
      logWithTime(`🔴 Error transcribing audio: ${error}`);
      throw error;
    }
  };
}

export { ChatGPT };
