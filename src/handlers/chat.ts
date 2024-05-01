import type { ChatMessage as ChatResponseV4 } from 'chatgpt';
import _ from 'lodash';
import type TelegramBot from 'node-telegram-bot-api';
import telegramifyMarkdown from 'telegramify-markdown';
import type { ChatGPT } from '../api.js';
import { BotOptions } from '../types.js';
import { logWithTime } from '../utils.js';
import Queue from 'promise-queue';
import { DB } from '../db.js';
import { randomEmoji } from '../lib/random.emoji.js';
import { aiModeration } from '../lib/openai.js';
import { downloadIfNeeded } from '../lib/file.download.js';
import { FileData } from '../lib/read.files.js';

enum actionEnum {
  COME_BACK_LATER = 'COME_BACK_LATER',
  START_LISTENING = 'START_LISTENING',
  FINISH_LISTENING = 'FINISH_LISTENING',
  SKIP_DISCUSSION = 'SKIP_DISCUSSION',
  START_DISCUSSION = 'START_DISCUSSION',
  FINISH_DISCUSSION = 'FINISH_DISCUSSION',
}

const days = new Map<number, number>();
const discussion = new Map<number, boolean>();
const listening = new Map<number, boolean>();

class ChatHandler {
  debug: number;
  protected _opts: BotOptions;
  protected _bot: TelegramBot;
  protected _api: ChatGPT;
  protected _n_queued = 0;
  protected _n_pending = 0;
  protected _apiRequestsQueue = new Queue(1, Infinity);
  protected _positionInQueue = new Map<string, number>();
  protected _updatePositionQueue = new Queue(20, Infinity);
  protected _db: DB;
  protected _prompts: FileData;

  constructor(
    bot: TelegramBot,
    api: ChatGPT,
    botOpts: BotOptions,
    db: DB,
    debug = 1,
    prompts: FileData,
  ) {
    this.debug = debug;
    this._bot = bot;
    this._api = api;
    this._opts = botOpts;
    this._db = db;
    this._prompts = prompts;
  }

  nextState(chatId: number, action: actionEnum) {
    let day = days.get(chatId);
    if (!day) {
      days.set(chatId, 0);
      day = 0;
    }
    if (action === actionEnum.COME_BACK_LATER) {
      return;
    }
    if (action === actionEnum.START_LISTENING) {
      days.set(chatId, day + 1);
      discussion.set(chatId, false);
      listening.set(chatId, true);
    }
    if (action === actionEnum.FINISH_LISTENING) {
      discussion.set(chatId, false);
      listening.set(chatId, false);
    }
    if (action === actionEnum.START_DISCUSSION) {
      discussion.set(chatId, true);
      listening.set(chatId, true);
    }
    if (action === actionEnum.SKIP_DISCUSSION) {
      discussion.set(chatId, false);
      listening.set(chatId, false);
    }
    if (action === actionEnum.FINISH_DISCUSSION) {
      discussion.set(chatId, false);
      listening.set(chatId, false);
    }
  }

  handle = async (
    msg: TelegramBot.Message,
    text: string,
    isMentioned: boolean,
  ): Promise<void> => {
    console.log(isMentioned);
    if (!text) return;

    if (msg.chat.type !== 'private' && isMentioned) {
      await this._bot.sendMessage(
        msg.chat.id,
        `Общение возможно только в личной переписке`,
      );
      return;
    }
    if (msg.chat.type !== 'private' && !isMentioned) {
      return;
    }

    if (text === 'Вернуться позже') {
      this.nextState(msg.chat.id, actionEnum.COME_BACK_LATER);
      await this._bot.sendChatAction(msg.chat.id, 'typing');
      await this._bot.sendMessage(
        msg.chat.id,
        `Возвращайтесь, когда у вас будет время. До встречи!`,
        {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [[{ text: 'Включить подкаст' }]],
          },
        },
      );
      return;
    }

    if (text === 'Включить подкаст') {
      this.nextState(msg.chat.id, actionEnum.START_LISTENING);
      const day = days.get(msg.chat.id) ?? 1;

      if (day > 3) {
        await this._bot.sendMessage(
          msg.chat.id,
          `Вы послушали все подкасты. Спасибо за участие!`,
        );
        return;
      }

      await this._bot.sendChatAction(msg.chat.id, 'typing');
      const link = `https://storage.yandexcloud.net/photos.prostoapp.life/bot_podcast/podcast_day_${day}_compressed.mp3`;
      const filePath = await downloadIfNeeded(link);
      await this._bot.sendAudio(
        msg.chat.id,
        filePath,
        {
          // duration: 4076,
          protect_content: true,
          reply_markup: {
            keyboard: [[{ text: 'Я послушал(а) подкаст' }]],
          },
        },
        {
          filename: `День ${day}.mp3`,
          contentType: 'audio/mpeg',
        },
      );
      return;
    }

    if (text === 'Я послушал(а) подкаст') {
      this.nextState(msg.chat.id, actionEnum.FINISH_LISTENING);
      await this._bot.sendChatAction(msg.chat.id, 'typing');
      await this._bot.sendMessage(
        msg.chat.id,
        `Какие впечатления от подкаста? Давайте обсудим в чате`,
        {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [{ text: 'Обсудить' }],
              [{ text: 'Пропустить обсуждение' }],
            ],
          },
        },
      );
      return;
    }

    if (text === 'Пропустить обсуждение') {
      const day = days.get(msg.chat.id) ?? 1;
      if (day >= 3) {
        await this._bot.sendMessage(
          msg.chat.id,
          `Вы послушали все подкасты. Спасибо за участие!`,
        );
        return;
      }

      this.nextState(msg.chat.id, actionEnum.SKIP_DISCUSSION);
      await this._bot.sendChatAction(msg.chat.id, 'typing');
      await this._bot.sendMessage(
        msg.chat.id,
        `Хорошо. Вы готовы послушать следующий эпизод?`,
        {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [{ text: 'Включить подкаст' }],
              [{ text: 'Вернуться позже' }],
            ],
          },
        },
      );
      return;
    }

    if (text === 'Завершить обсуждение') {
      this.nextState(msg.chat.id, actionEnum.FINISH_DISCUSSION);
      const day = days.get(msg.chat.id) ?? 1;
      if (day >= 3) {
        await this._bot.sendMessage(
          msg.chat.id,
          `Вы послушали все подкасты. Спасибо за участие!`,
        );
        return;
      }
      await this._bot.sendChatAction(msg.chat.id, 'typing');
      await this._bot.sendMessage(
        msg.chat.id,
        `Спасибо за обсуждение! Надеюсь, информация из подкаста поможет улучшить ваш сон. Вы готовы послушать следующий эпизод?`,
        {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [{ text: 'Включить подкаст' }],
              [{ text: 'Вернуться позже' }],
            ],
          },
        },
      );
      return;
    }

    if (text === 'Обсудить') {
      this.nextState(msg.chat.id, actionEnum.START_DISCUSSION);
      await this._bot.sendMessage(msg.chat.id, 'Отлично!', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: 'Завершить обсуждение' }]],
        },
      });

      const day = days.get(msg.chat.id) ?? 1;
      if (day > 3) {
        await this._bot.sendMessage(
          msg.chat.id,
          `Вы послушали все подкасты. Спасибо за участие!`,
        );
        return;
      }

      const prompt = `audio${day}`;
      const instruction = this._prompts[prompt];
      if (instruction) {
        await this.handle(msg, instruction, isMentioned);
      }
      return;
    }

    if (discussion.get(msg.chat.id)) {
      const chatId = msg.chat.id;
      if (this.debug >= 1) {
        const userInfo = `@${msg.from?.username ?? ''} (${msg.from?.id})`;
        const chatInfo =
          msg.chat.type == 'private'
            ? 'private chat'
            : `group ${msg.chat.title} (${msg.chat.id})`;
        logWithTime(`📩 Message from ${userInfo} in ${chatInfo}:\n${text}`);
      }

      const flaggedCategories = await aiModeration(text);
      if (flaggedCategories.size > 0) {
        const message =
          '⚠️ Извините, я не могу ответить на ваше сообщение в соответствии с политикой модерации';
        // for (const [key, value] of flaggedCategories) {
        //   message += `\n\n[${key}: ${value}]`;
        // }
        await this._bot.sendMessage(chatId, message, {
          reply_markup: {
            keyboard: [[{ text: 'Завершить обсуждение' }]],
          },
        });
        return;
      }

      // Send a message to the chat acknowledging receipt of their message
      const reply = await this._bot.sendMessage(
        chatId,
        this._opts.queue ? '⌛' : randomEmoji(),
        {
          reply_to_message_id: msg.message_id,
        },
      );

      if (!this._opts.queue) {
        await this._sendToGpt(msg, text, chatId, reply);
      } else {
        // add to sequence queue due to chatGPT processes only one request at a time
        const requestPromise = this._apiRequestsQueue.add(() => {
          return this._sendToGpt(msg, text, chatId, reply);
        });
        if (this._n_pending == 0) {
          this._n_pending++;
        } else {
          this._n_queued++;
        }
        this._positionInQueue.set(
          this._getQueueKey(chatId, reply.message_id),
          this._n_queued,
        );

        await this._bot.editMessageText(
          this._n_queued > 0
            ? `⌛: Пожалуйста, подождите. Перед Вами в очереди запросов: #${this._n_queued}`
            : randomEmoji(),
          {
            chat_id: chatId,
            message_id: reply.message_id,
          },
        );
        await requestPromise;
      }
    }

    if (!days.get(msg.chat.id)) {
      await this._bot.sendChatAction(msg.chat.id, 'typing');
      await this._bot.sendMessage(
        msg.chat.id,
        `Приветствую! Я - ваш гид в мире сна. Вместе с известным сомнологом Романом Бузуновым мы подготовили для вас серию увлекательных подкастов о физиологии сна, разрушении мифов и полезных рекомендациях. Всего доступно три подкаста. Вы готовы их послушать?`,
        {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [{ text: 'Включить подкаст' }],
              [{ text: 'Вернуться позже' }],
            ],
          },
        },
      );
    }
  };

  protected _sendToGpt = async (
    msg: TelegramBot.Message,
    text: string,
    chatId: number,
    originalReply: TelegramBot.Message,
  ) => {
    const userId = msg.from?.id ?? 0;
    let reply = originalReply;
    await this._bot.sendChatAction(chatId, 'typing');

    const ON_PROGRESS_WAIT_MS = 3000;

    const onProgress = _.throttle(
      async (partialResponse: ChatResponseV4) => {
        reply = await this._editMessage(reply, partialResponse.text);
        await this._bot.sendChatAction(chatId, 'typing');
      },
      ON_PROGRESS_WAIT_MS,
      { leading: true, trailing: false },
    );

    // Send a message to ChatGPT
    try {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const res = await this._api.sendMessage(msg, text, chatId, onProgress);
      await this._editMessage(reply, res.text);

      if (this.debug >= 1) logWithTime(`📨 Response:\n${res.text}`);
    } catch (err) {
      logWithTime('⛔️ ChatGPT API error:', (err as Error).message);
      await this._db.clearContext(chatId, userId);
      await this._bot.sendMessage(
        chatId,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (err as Error).message ??
          "⚠️ Sorry, I'm having trouble connecting to the server, please try again later.",
      );
    }

    // Update queue order after finishing current request
    await this._updateQueue(chatId, reply.message_id);
  };

  // Edit telegram message
  protected _editMessage = async (
    msg: TelegramBot.Message,
    text: string,
    needParse = true,
  ) => {
    if (!text || text.trim() == '' || msg.text == text) {
      return msg;
    }
    try {
      text = telegramifyMarkdown(text, 'escape');
      const res = await this._bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: needParse ? 'MarkdownV2' : undefined,
      });
      // type of res is boolean | Message
      if (typeof res === 'object') {
        // return a Message type instance if res is a Message type
        return res;
      } else {
        // return the original message if res is a boolean type
        return msg;
      }
    } catch (err) {
      logWithTime('⛔️ Edit message error:', (err as Error).message);
      if (this.debug >= 2) logWithTime('⛔️ Message text:', text);
      return msg;
    }
  };

  protected _getQueueKey = (chatId: number, messageId: number) =>
    `${chatId}:${messageId}`;

  protected _parseQueueKey = (key: string) => {
    const [chat_id, message_id] = key.split(':');

    return { chat_id, message_id };
  };

  protected _updateQueue = async (chatId: number, messageId: number) => {
    // delete value for current request
    const queueKey = this._getQueueKey(chatId, messageId);
    this._positionInQueue.delete(queueKey);

    if (this._n_queued > 0) {
      this._n_queued--;
    } else {
      this._n_pending--;
    }

    for (const [key, value] of this._positionInQueue.entries()) {
      const { chat_id, message_id } = this._parseQueueKey(key);
      this._positionInQueue.set(key, value - 1);
      await this._updatePositionQueue.add(async () => {
        const position = this._positionInQueue.get(key) ?? 0;
        return this._bot.editMessageText(
          position > 0
            ? `⌛: Пожалуйста, подождите. Перед Вами в очереди запросов: #${this._positionInQueue.get(
                key,
              )}`
            : randomEmoji(),
          {
            chat_id,
            message_id: Number(message_id),
          },
        );
      });
    }
  };
}

export { ChatHandler };
