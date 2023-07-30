import { Configuration, OpenAIApi } from 'openai';
import config from 'config';
import { isFlagged } from './moderation.js';

const OPEN_AI_KEY =
  process.env.OPENAI_API_KEY ?? config.get<string>('api.official.apiKey');

const configuration = new Configuration({
  apiKey: OPEN_AI_KEY,
});
const openai = new OpenAIApi(configuration);

export async function aiModeration(
  input: string,
): Promise<Map<string, number>> {
  try {
    const response = await openai.createModeration({
      input,
    });
    return isFlagged(response.data);
  } catch (error) {
    console.error(error);
    throw Error('Failed to moderate');
  }
}
