function getRandomElement<T>(array: T[]): T {
  const randomIndex = Math.floor(Math.random() * array.length);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return array[randomIndex] as T;
}

const emojis = [
  '🥰',
  '😎',
  '😇',
  '😏',
  '🐠',
  '🦭',
  '🍀',
  '🦢',
  '🦙',
  '🐱',
  '⛅',
  '🦋',
  '🕊',
  '🐥',
  '👩‍💻',
  '🌺',
  '💃',
  '💫',
  '🤭',
  '🤗',
];

export function randomEmoji(): string {
  return getRandomElement<string>(emojis);
}
