import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { BotOptions } from '../types.js';
import { logWithTime } from '../utils.js';

class Authenticator {
  debug: number;
  protected _bot: TelegramBot;
  protected _opts: BotOptions;

  constructor(bot: TelegramBot, botOpts: BotOptions, debug = 1) {
    this.debug = debug;
    this._bot = bot;
    this._opts = botOpts;
  }

  authenticate = (msg: Message) => {
    if (msg.chat.type === 'private') {
      if (
        this._opts.userIds.length !== 0 &&
        !this._opts.userIds.includes(msg.chat.id)
      ) {
        logWithTime(
          '⚠️ Authentication failed for user ' +
            `@${msg.from?.username ?? ''} (${msg.from?.id}).`,
        );
        void this._bot.sendMessage(
          msg.chat.id,
          '⛔️ Sorry, you are not my owner. I cannot chat with you or execute your command.',
        );
        return false;
      }
    } else {
      if (
        this._opts.groupIds.length !== 0 &&
        !this._opts.groupIds.includes(msg.chat.id)
      ) {
        logWithTime(
          `⚠️ Authentication failed for group ${msg.chat.title} (${msg.chat.id}).`,
        );
        void this._bot.sendMessage(
          msg.chat.id,
          "⛔️ Sorry, I'm not supposed to work here. Please remove me from the group.",
        );
        return false;
      }
    }
    return true;
  };
}

export { Authenticator };
