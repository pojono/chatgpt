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
    botUsername: string,
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

    const commandArgs = msg.text?.split(' ');
    const firstArg = commandArgs?.[1];

    // Ignore commands without a mention in groups.
    if (msg.chat.type != 'private' && !isMentioned) return;

    switch (command) {
      case '/start':
        await this._bot.sendChatAction(msg.chat.id, 'typing');
        await this._api.resetThread(msg.chat.id, userId);
        await this._chatHandler.handle(
          msg,
          this._api._instruction,
          isMentioned,
        );
        break;

      case '/help':
        await this._bot.sendMessage(
          msg.chat.id,
          'To chat with me, you can:\n' +
            '  • send messages directly (not supported in groups)\n' +
            `  • send messages that start with ${this._opts.chatCmd}\n` +
            '  • reply to my last message\n\n' +
            'Command list:\n' +
            `(When using a command in a group, make sure to include a mention after the command, like /help@${botUsername}).\n` +
            '  • /help Show help information.\n' +
            '  • /reset Reset the current chat thread and start a new one.\n' +
            '  • /reload (admin required) Refresh the ChatGPT session.',
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

      case '/mode':
        await this._bot.sendChatAction(msg.chat.id, 'typing');
        await this._bot.sendMessage(
          msg.chat.id,
          Object.keys(this._prompts)
            .map((key) => `/set ${key}`)
            .join('\n') || 'No chat modes found.',
        );
        logWithTime(`🔄 Chat modes were sent to ${userInfo}.`);
        break;

      case '/set':
        await this._bot.sendChatAction(msg.chat.id, 'typing');
        // eslint-disable-next-line no-case-declarations
        const mode = firstArg ?? '';
        // eslint-disable-next-line no-case-declarations
        const prompt = this._prompts[mode];
        if (prompt) {
          this._api.updateSystemMessage(prompt);
          await this._api.resetAllThreads();
          await this._bot.sendMessage(
            msg.chat.id,
            `🔄 Общение переведено в режим "${mode}" для всех пользователей во всех чатах. Контекст всех диалогов сброшен`,
          );
          logWithTime(`🔄 Chat mode has been updated to "${mode}".`);
        } else {
          await this._bot.sendMessage(
            msg.chat.id,
            `🔄 Режим "${mode}" не найден.`,
          );
          logWithTime(`🔄 Chat mode "${mode}" is not found.`);
        }
        break;

      case '/reload':
        if (msg.from?.id !== this._opts.ownerId) {
          await this._bot.sendMessage(
            msg.chat.id,
            '⛔️ Sorry, you do not have the permission to run this command.',
          );
          logWithTime(
            `⚠️ Permission denied for "${command}" from ${userInfo}.`,
          );
        } else {
          await this._bot.sendChatAction(msg.chat.id, 'typing');
          await this._bot.sendMessage(msg.chat.id, '🔄 Restarting...');
          await shutdown();
          logWithTime(`🔄 Session refreshed by ${userInfo}.`);
        }
        break;

      default:
        await this._bot.sendMessage(
          msg.chat.id,
          '⚠️ Unsupported command. Run /help to see the usage.',
        );
        break;
    }
  };
}

export { CommandHandler };
