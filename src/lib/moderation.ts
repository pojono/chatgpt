import { CreateModerationResponse } from 'openai/api.js';

const moderationScores = new Map<string, number>([
  ['sexual', 0.3],
  ['hate', 0.3],
  ['harassment', 0.3],
  ['self-harm', 0.3],
  ['sexual/minors', 0.3],
  ['hate/threatening', 0.3],
  ['violence/graphic', 0.3],
  ['self-harm/intent', 0.3],
  ['self-harm/instructions', 0.3],
  ['harassment/threatening', 0.3],
  ['violence', 0.3],
]);

const isFlaggedCategory = (key: string, value: number): boolean => {
  if (moderationScores.has(key)) {
    const score = moderationScores.get(key);
    if (score) {
      return value >= score;
    }
  }
  return false;
};

export const isFlagged = (data: CreateModerationResponse): boolean => {
  const results = data.results;
  for (const result of results) {
    // OpenAI updates their moderation policy frequently, so npm package interface can be outdated.
    const categories = result.category_scores as unknown as Record<
      string,
      number
    >;
    for (const [key, value] of Object.entries(categories)) {
      const isFlagged = isFlaggedCategory(key, value);
      if (isFlagged) {
        return true;
      }
    }
  }
  return false;
};
