import type TelegramBot from 'node-telegram-bot-api';
import type { ChatGPT } from '../api.js';
import { BotOptions } from '../types.js';
import { logWithTime } from '../utils.js';
import { shutdown } from '../lib/shutdown.js';
import { FileData } from '../lib/read.files.js';
import { ChatHandler } from './chat.js';

class CommandHandler {
  debug: number;
  protected _opts: BotOptions;
  protected _bot: TelegramBot;
  protected _api: ChatGPT;
  protected _prompts: FileData;
  protected _chatHandler: ChatHandler;

  constructor(
    bot: TelegramBot,
    api: ChatGPT,
    botOpts: BotOptions,
    prompts: FileData,
    debug = 1,
    _chatHandler: ChatHandler,
  ) {
    this.debug = debug;
    this._bot = bot;
    this._api = api;
    this._opts = botOpts;
    this._prompts = prompts;
    this._chatHandler = _chatHandler;
  }

  handle = async (
    msg: TelegramBot.Message,
    command: string,
    isMentioned: boolean,
    // botUsername: string,
  ) => {
    const userId = msg.from?.id ?? 0;
    const userInfo = `@${msg.from?.username ?? ''} (${msg.from?.id})`;
    const chatInfo =
      msg.chat.type == 'private'
        ? 'private chat'
        : `group ${msg.chat.title} (${msg.chat.id})`;
    if (this.debug >= 1) {
      logWithTime(
        `👨‍💻️ User ${userInfo} issued command "${command}" in ${chatInfo} (isMentioned=${isMentioned}).`,
      );
    }

    // const commandArgs = msg.text?.split(' ');
    // const firstArg = commandArgs?.[1];

    // Ignore commands without a mention in groups.
    if (msg.chat.type != 'private' && !isMentioned) return;

    if (command.startsWith('/audio') && command.length === '/audio0'.length) {
      await this._bot.sendChatAction(msg.chat.id, 'typing');
      await this._api.resetThread(msg.chat.id, userId);

      const mode = command.slice(1);
      const instruction = this._prompts[mode];
      if (instruction) {
        await this._chatHandler.handle(msg, instruction, isMentioned);
      }
    }

    switch (command) {
      case '/start':
        await this._bot.sendMessage(
          msg.chat.id,
          `Приветствую! Я - ваш гид в мире сна. Вместе с известным сомнологом Романом Бузуновым мы подготовили для вас серию увлекательных подкастов о физиологии сна, разрушении мифов и полезных рекомендациях. Всего доступно три подкаста. Вы готовы их послушать?`,
        );
        break;
      case '/help':
        await this._bot.sendMessage(
          msg.chat.id,
          `
Общение с ботом зависит от того, какие данные внесены в Google Sheet.
https://docs.google.com/spreadsheets/d/1eroM0RfTK0YMHG6hHRoB7ubkBt_5pG9GTHTrTY7sikM/edit#gid=376591405`,
        );
        break;

      case '/reset':
        await this._bot.sendChatAction(msg.chat.id, 'typing');
        await this._api.resetThread(msg.chat.id, userId);
        await this._bot.sendMessage(
          msg.chat.id,
          '🔄 Контекст Вашего диалога в этом чате был сброшен.',
        );
        logWithTime(`🔄 Chat thread reset by ${userInfo}.`);
        break;

      case '/reload':
        await this._bot.sendChatAction(msg.chat.id, 'typing');
        await this._bot.sendMessage(msg.chat.id, '🔄 Restarting...');
        await shutdown();
        logWithTime(`🔄 Session refreshed by ${userInfo}.`);
        break;

      /*
      default:
        await this._bot.sendMessage(
          msg.chat.id,
          '⚠️ Unsupported command. Run /help to see the usage.',
        );
        break;
      */
    }
  };
}

export { CommandHandler };
