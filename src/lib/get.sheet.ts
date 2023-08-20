import { FileData } from './read.files.js';
import { google } from 'googleapis';
import { promisify } from 'util';
import { readFile } from 'fs';
const readFileAsync = promisify(readFile);

export async function fetchGoogleSheet(
  sheetUrl: string,
  privateKeyPath: string,
): Promise<FileData> {
  const privateKey = await readFileAsync(privateKeyPath, 'utf8');
  const credentials = JSON.parse(privateKey);
  const client = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  );
  const sheets = google.sheets({ version: 'v4', auth: client });
  const sheetId = extractSheetId(sheetUrl);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Prompts',
  });
  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const modeIndex = rows[0].indexOf('mode');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const promptIndex = rows[0].indexOf('prompt');
  rows.shift();

  const data: FileData = {};
  for (const row of rows) {
    const mode = row[modeIndex];
    if (row[promptIndex]) {
      data[mode] = row[promptIndex];
    }
  }
  return data;
}

function extractSheetId(sheetUrl: string): string {
  const start = sheetUrl.indexOf('/d/') + 3; // Find the index after '/d/'
  const end = sheetUrl.indexOf('/', start); // Find the next forward slash after '/d/'
  if (start !== -1 && end !== -1) {
    return sheetUrl.substring(start, end);
  }
  throw new Error('Invalid Google Sheet URL');
}
