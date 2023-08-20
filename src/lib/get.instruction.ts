import { FileData } from './read.files.js';

export function getInstruction(prompts: FileData): string {
  return 'start' in prompts ? prompts.start : 'Hello';
}
