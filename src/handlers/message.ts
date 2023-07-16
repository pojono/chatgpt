import type TelegramBot from 'node-telegram-bot-api';
import type { ChatGPT } from '../api';
import { BotOptions } from '../types';
import { logWithTime } from '../utils';
import { Authenticator } from './authentication';
import { ChatHandler } from './chat';
import { CommandHandler } from './command';
import { DB } from '../db';
import { botNames } from '../bot.names';

class MessageHandler {
  debug: number;
  protected _opts: BotOptions;
  protected _bot: TelegramBot;
  protected _botUsername = '';
  protected _api: ChatGPT;
  protected _authenticator: Authenticator;
  protected _commandHandler: CommandHandler;
  protected _chatHandler: ChatHandler;

  constructor(
    bot: TelegramBot,
    api: ChatGPT,
    botOpts: BotOptions,
    db: DB,
    debug = 1,
  ) {
    this.debug = debug;
    this._bot = bot;
    this._api = api;
    this._opts = botOpts;
    this._authenticator = new Authenticator(bot, botOpts, debug);
    this._commandHandler = new CommandHandler(bot, api, botOpts, debug);
    this._chatHandler = new ChatHandler(bot, api, botOpts, db, debug);
  }

  init = async () => {
    this._botUsername = (await this._bot.getMe()).username ?? '';
    logWithTime(`🤖 Bot @${this._botUsername} has started...`);
  };

  removeLettersByLengthAndOffset = (
    letters: string[],
    length: number,
    offset: number,
  ): string[] => {
    const result = [];
    for (let i = 0; i < letters.length; i++) {
      if (i < offset || i >= offset + length) {
        result.push(letters[i]);
      } else {
        result.push('');
      }
    }
    return result;
  };

  extractTextByLengthAndOffset = (
    input: string,
    length: number,
    offset: number,
  ): string => {
    return input.slice(offset, length + offset);
  };

  isMentioned = (msg: TelegramBot.Message): boolean => {
    const names = [
      this._botUsername,
      this._botUsername.toLowerCase(),
      this._botUsername.toUpperCase(),
      ...botNames(),
    ];
    for (const name of names) {
      if (msg.text?.includes(name)) {
        return true;
      }
    }
    return false;
  };

  handle = async (msg: TelegramBot.Message) => {
    if (this.debug >= 2) logWithTime(msg);

    // Authentication.
    if (!(await this._authenticator.authenticate(msg))) return;

    // Parse message.
    const { text, command, isMentioned } = this._parseMessage(msg);
    if (command != '' && command != this._opts.chatCmd) {
      // For commands except `${chatCmd}`, pass the request to commandHandler.
      await this._commandHandler.handle(
        msg,
        command,
        isMentioned,
        this._botUsername,
      );
    } else {
      // Handles:
      // - direct messages in private chats
      // - replied messages in both private chats and group chats
      // - messages that start with `chatCmd` in private chats and group chats
      await this._chatHandler.handle(msg, text, isMentioned);
    }
  };

  protected _parseMessage = (msg: TelegramBot.Message) => {
    let letters = msg?.text?.split('') ?? [];
    let command = '';
    if ('entities' in msg) {
      for (const entity of msg.entities ?? []) {
        if (entity.type == 'mention') {
          letters = this.removeLettersByLengthAndOffset(
            letters,
            entity.length,
            entity.offset,
          );
        }
        if (entity.type == 'bot_command') {
          letters = this.removeLettersByLengthAndOffset(
            letters,
            entity.length,
            entity.offset,
          );
          command = this.extractTextByLengthAndOffset(
            msg?.text || '',
            entity.length,
            entity.offset,
          );
        }
      }
    }

    let isMentioned = this.isMentioned(msg);
    if (msg.reply_to_message) {
      if (msg.reply_to_message.from?.username === this._botUsername) {
        isMentioned = true;
      }
    }

    const text = letters.join('').trim();
    return { text, command, isMentioned };
  };
}

export { MessageHandler };
