import { open, RootDatabase } from 'lmdb';
import { logWithTime } from './utils.js';

interface ContextObject {
  conversationId?: string;
  parentMessageId?: string;
}

type Context = ContextObject | undefined;

export class DB {
  protected _db: RootDatabase;

  constructor() {
    this._db = open({
      path: 'database',
      compression: true,
    });
  }

  getKey = (chatId: number, userId: number) => `${chatId}:${userId}`;

  getContext = (chatId: number, userId: number): Promise<Context> => {
    const key = this.getKey(chatId, userId);
    if (this._db) {
      return this._db.get(key);
    } else {
      logWithTime('DB is not initialised!');
      return Promise.reject(undefined);
    }
  };
  updateContext = async (
    chatId: number,
    userId: number,
    newContext: Pick<ContextObject, 'conversationId'> &
      Required<Pick<ContextObject, 'parentMessageId'>>,
  ) => {
    const key = this.getKey(chatId, userId);
    if (this._db) {
      await this._db.put(key, newContext);
    } else {
      logWithTime('DB is not initialised!');
    }
  };
  clearContext = async (chatId: number, userId: number) => {
    const key = this.getKey(chatId, userId);
    if (this._db) {
      await this._db.remove(key);
    } else {
      logWithTime('DB is not initialised!');
    }
  };
  clearAllContexts = async () => {
    if (this._db) {
      await this._db.clearAsync();
    } else {
      logWithTime('DB is not initialised!');
    }
  };
}
