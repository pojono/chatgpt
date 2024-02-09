import { FileData } from './read.files.js';

export function getDefaultPrompt(prompts: FileData): string {
  return 'start' in prompts
    ? prompts.start
    : 'You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.';
}
