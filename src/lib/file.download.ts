import * as fs from 'fs';
import * as https from 'https';
import { promisify } from 'util';
import * as path from 'path';

// Promisify fs.exists (which does not directly follow the Node convention)
const access = promisify(fs.access);

export async function downloadIfNeeded(url: string): Promise<string> {
  // Assuming URL structure is simple and last part is the filename
  // In real-world scenarios, consider using a proper URL parser
  const filename = url.split('/').pop() ?? 'downloadedfile';
  const filepath = path.join('/tmp', filename);

  try {
    // Check if file exists
    await access(filepath, fs.constants.F_OK);
    console.log('File already exists:', filepath);
  } catch {
    // File does not exist, so let's download it
    console.log('Downloading file:', url);
    await new Promise<void>((resolve, reject) => {
      const filestream = fs.createWriteStream(filepath);
      https
        .get(url, (response) => {
          response.pipe(filestream);
          filestream.on('finish', () => {
            filestream.close(() => {
              resolve();
            });
          });
        })
        .on('error', (err) => {
          fs.unlink(filepath, () => {
            reject(err);
          }); // Delete the file async. (No need to wait for this to finish before we throw error)
        });
    });
  }

  return filepath;
}
