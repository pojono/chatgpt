export function removeLettersByLengthAndOffset(
  letters: string[],
  length: number,
  offset: number,
): string[] {
  const result = [];
  for (let i = 0; i < letters.length; i++) {
    if (i < offset || i >= offset + length) {
      // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
      result.push(letters[i] as string);
    } else {
      result.push('');
    }
  }
  return result;
}

export function extractTextByLengthAndOffset(
  input: string,
  length: number,
  offset: number,
): string {
  return input.slice(offset, length + offset);
}
