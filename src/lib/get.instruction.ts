import { FileData } from './read.files.js';

export function getInstruction(prompts: FileData): string {
  return 'audio1' in prompts ? prompts.audio1 : 'Hello';
}
