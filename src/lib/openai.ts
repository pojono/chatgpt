import { Configuration, OpenAIApi } from 'openai';
import config from 'config';
import { CreateModerationResponse } from 'openai/api.js';

const OPEN_AI_KEY =
  process.env.OPENAI_API_KEY ?? config.get<string>('api.official.apiKey');

const configuration = new Configuration({
  apiKey: OPEN_AI_KEY,
});
const openai = new OpenAIApi(configuration);

export async function aiModeration(input: string): Promise<boolean> {
  try {
    const response = await openai.createModeration({
      input,
    });
    const data: CreateModerationResponse = response.data;
    const results = data.results;
    for (const result of results) {
      const categories = result.category_scores;
      const isFlagged = Object.values(categories).some(
        (value) => value >= 0.03,
      );
      if (isFlagged) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
}
