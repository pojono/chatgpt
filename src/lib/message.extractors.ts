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

export function extractTextWithinSquareBrackets(input: string): string {
  const startIndex = input.indexOf('[');
  const endIndex = input.indexOf(']');

  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    return input.substring(startIndex + 1, endIndex);
  }
  return '';
}

export function getTextAfterBracket(input: string): string {
  if (input.startsWith('[')) {
    const closingBracketIndex = input.indexOf(']');
    if (closingBracketIndex !== -1) {
      return input.substring(closingBracketIndex + 1);
    }
  }
  return input;
}
