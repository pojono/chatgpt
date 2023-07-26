import { open, RootDatabase } from 'lmdb';

interface ContextObject {
  conversationId?: string;
  parentMessageId?: string;
}

type Context = ContextObject | undefined;

export class DB {
  protected _db: RootDatabase;

  constructor() {
    this._db = open<Context, string>({
      path: 'database',
      compression: true,
    });
  }

  getKey = (chatId: number, userId: number) => `${chatId}:${userId}`;

  getContext = (chatId: number, userId: number): Context => {
    const key = this.getKey(chatId, userId);
    const result = this._db.get(key) as Context;
    return result;
  };
  updateContext = async (
    chatId: number,
    userId: number,
    newContext: Pick<ContextObject, 'conversationId'> &
      Required<Pick<ContextObject, 'parentMessageId'>>,
  ) => {
    const key = this.getKey(chatId, userId);
    await this._db.put(key, newContext);
  };
  clearContext = async (chatId: number, userId: number) => {
    const key = this.getKey(chatId, userId);
    await this._db.remove(key);
  };
  clearAllContexts = async () => {
    await this._db.clearAsync();
  };
}
