import type TelegramBot from 'node-telegram-bot-api';
import type { ChatGPT } from '../api.js';
import { BotOptions } from '../types.js';
import { logWithTime } from '../utils.js';
import { Authenticator } from './authentication.js';
import { ChatHandler } from './chat.js';
import { CommandHandler } from './command.js';
import { DB } from '../db.js';
import { botNames } from '../lib/bot.names.js';
import {
  extractTextByLengthAndOffset,
  removeLettersByLengthAndOffset,
} from '../lib/message.extractors.js';
import { FileData } from '../lib/read.files.js';

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
    prompts: FileData,
    debug = 1,
  ) {
    this.debug = debug;
    this._bot = bot;
    this._api = api;
    this._opts = botOpts;
    this._authenticator = new Authenticator(bot, botOpts, debug);
    this._chatHandler = new ChatHandler(bot, api, botOpts, db, debug);
    this._commandHandler = new CommandHandler(
      bot,
      api,
      botOpts,
      prompts,
      debug,
      this._chatHandler,
    );
  }

  init = async () => {
    this._botUsername = (await this._bot.getMe()).username ?? '';
    logWithTime(`🤖 Bot @${this._botUsername} has started...`);
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
    if (!this._authenticator.authenticate(msg)) return;

    if (
      msg.from?.username?.includes('nastya_mentor') ||
      msg.from?.username?.includes('pojono')
    ) {
      /* empty */
    } else {
      await this._bot.sendMessage(msg.chat.id, '⚠️ Sorry, access denied.');
      return;
    }

    if (msg.audio) {
      // Handle audio files - only transcribe
      await this.handleAudioFile(msg);
      return;
    }

    // Handle voice messages - treat as regular messages
    if (msg.voice) {
      await this.handleVoiceMessage(msg);
      return;
    }

    // Parse message.
    const { text, command, isMentioned } = this._parseMessage(msg);
    if (command != '' && command != this._opts.chatCmd) {
      // For commands except `${chatCmd}`, pass the request to commandHandler.
      void this._commandHandler.handle(
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
      void this._chatHandler.handle(msg, text, isMentioned);
    }
  };

  protected _parseMessage = (msg: TelegramBot.Message) => {
    let letters = msg.text?.split('') ?? [];
    let command = '';
    if ('entities' in msg) {
      for (const entity of msg.entities ?? []) {
        if (entity.type == 'mention') {
          letters = removeLettersByLengthAndOffset(
            letters,
            entity.length,
            entity.offset,
          );
        }
        if (entity.type == 'bot_command') {
          console.log(
            'entity',
            entity.type,
            entity.length,
            entity.offset,
            letters,
          );
          // just a text, but with a slash inside
          if (entity.offset > 0) {
            return { text: msg.text, command: '', isMentioned: false };
          }
          letters = removeLettersByLengthAndOffset(
            letters,
            entity.length,
            entity.offset,
          );
          command = extractTextByLengthAndOffset(
            msg.text ?? '',
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

  protected handleAudioFile = async (msg: TelegramBot.Message) => {
    try {
      const chatId = msg.chat.id;
      const fileId = msg.audio?.file_id;

      if (!fileId) {
        await this._bot.sendMessage(
          chatId,
          "Sorry, I couldn't process this audio file.",
        );
        return;
      }

      // Send a processing message
      const processingMsg = await this._bot.sendMessage(
        chatId,
        '🎧 Processing your audio file...',
      );

      // Get file URL from Telegram
      const file = await this._bot.getFile(fileId);
      if (!file.file_path) {
        throw new Error("Couldn't get the file path");
      }

      const fileUrl = `https://api.telegram.org/file/bot${this._opts.token}/${file.file_path}`;

      // Transcribe the audio
      const transcription = await this._api.transcribeAudio(fileUrl);

      // Delete the processing message
      await this._bot.deleteMessage(chatId, processingMsg.message_id);

      // Split transcription into chunks of max 4000 characters (leaving some room for formatting)
      const MAX_LENGTH = 4000;
      const transcriptionChunks = transcription.match(
        new RegExp(`.{1,${MAX_LENGTH}}(\\s|$)`, 'g'),
      ) ?? [transcription];

      // Send each chunk as a separate message
      for (let i = 0; i < transcriptionChunks.length; i++) {
        const chunk = transcriptionChunks[i]?.trim();
        const prefix =
          transcriptionChunks.length > 1
            ? `🎙️ Transcription (part ${i + 1}/${
                transcriptionChunks.length
              }):\n\n`
            : '🎙️ Transcription:\n\n';

        await this._bot.sendMessage(chatId, prefix + chunk);
      }
    } catch (error) {
      logWithTime(`🔴 Error handling audio file: ${error}`);
      await this._bot.sendMessage(
        msg.chat.id,
        'Sorry, I encountered an error while processing your audio file.',
      );
    }
  };

  protected handleVoiceMessage = async (msg: TelegramBot.Message) => {
    try {
      const chatId = msg.chat.id;
      const fileId = msg.voice?.file_id;

      if (!fileId) {
        await this._bot.sendMessage(
          chatId,
          "Sorry, I couldn't process this voice message.",
        );
        return;
      }

      // Get file URL from Telegram
      const file = await this._bot.getFile(fileId);
      if (!file.file_path) {
        throw new Error("Couldn't get the file path");
      }

      const fileUrl = `https://api.telegram.org/file/bot${this._opts.token}/${file.file_path}`;

      // Transcribe the audio
      const transcription = await this._api.transcribeAudio(fileUrl);

      console.log('Voice message transcription', transcription);
      // Process the transcribed text as a regular message
      await this._chatHandler.handle(
        { ...msg, text: transcription },
        transcription,
        msg.chat.type === 'private',
      );
    } catch (error) {
      logWithTime(`🔴 Error handling voice message: ${error}`);
      await this._bot.sendMessage(
        msg.chat.id,
        'Sorry, I encountered an error while processing your voice message.',
      );
    }
  };
}

export { MessageHandler };
