function getRandomElement<T>(array: T[]): T {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

const emojis = ['🥰', '😎', '😇', '😏'];

export function randomEmoji(): string {
  return getRandomElement<string>(emojis);
}
