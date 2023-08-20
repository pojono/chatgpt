import { FileData } from './read.files.js';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchGoogleSheet } from './get.sheet.js';

export async function getPrompts(): Promise<FileData> {
  const sheetUrl =
    'https://docs.google.com/spreadsheets/d/1eroM0RfTK0YMHG6hHRoB7ubkBt_5pG9GTHTrTY7sikM/edit';
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const privateKeyPath = path.join(__dirname, '../../prompt', 'key.json');
  return fetchGoogleSheet(sheetUrl, privateKeyPath);
}
