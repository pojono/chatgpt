import { FileData, readFiles } from './read.files';
import { fileURLToPath } from 'url';
import path from 'path';

export function getPrompts(): FileData {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return readFiles(path.join(__dirname, '../../prompt'));
}
