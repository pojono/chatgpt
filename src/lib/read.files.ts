import fs from 'fs';
import path from 'path';

export type FileData = { [key: string]: string };

export function readFiles(folderPath: string): FileData {
  try {
    const files = fs.readdirSync(folderPath);
    const fileData: FileData = {};
    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const content = fileContent.trim().split('\n').join(' ');
      const fileName = path.parse(file).name;

      if (path.extname(file) === '.txt') {
        fileData[fileName] = content;
      }
    });
    return fileData;
  } catch (e) {
    console.log('ReadFiles Error:', e);
    return {};
  }
}
