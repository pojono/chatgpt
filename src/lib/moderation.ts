import { CreateModerationResponse } from 'openai/api.js';

const moderationScores = new Map<string, number>([
  ['sexual', 0.1],
  ['hate', 0.1],
  ['harassment', 0.1],
  ['self-harm', 0.1],
  ['sexual/minors', 0.1],
  ['hate/threatening', 0.1],
  ['violence/graphic', 0.1],
  ['self-harm/intent', 0.1],
  ['self-harm/instructions', 0.1],
  ['harassment/threatening', 0.1],
  ['violence', 0.1],
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

export const isFlagged = (
  data: CreateModerationResponse,
): Map<string, number> => {
  const flaggedCategories: Map<string, number> = new Map<string, number>();

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
        flaggedCategories.set(key, value);
      }
    }
  }
  return flaggedCategories;
};
