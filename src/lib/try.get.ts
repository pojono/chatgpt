import config from 'config';

export function tryGet<T>(key: string): T | undefined {
  const hasValue = config.has(key);
  if (!hasValue) {
    return undefined;
  } else {
    const value = config.get<T>(key);
    const isDefined = Boolean(value);
    return isDefined ? value : undefined;
  }
}
