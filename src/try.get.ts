import config from 'config';

export function tryGet<T>(key: string): T | undefined {
  if (!config.has(key)) {
    return undefined;
  } else {
    return config.get<T>(key);
  }
}
