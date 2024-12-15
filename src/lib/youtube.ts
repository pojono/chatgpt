import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';
import path from 'path';
import { logWithTime } from '../utils.js';

const execAsync = promisify(exec);

export async function downloadYouTubeVideo(url: string): Promise<string> {
  try {
    // Create a temporary filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const outputPath = path.join('/tmp', `yt_${timestamp}.mp3`);

    // Download the video using yt-dlp
    const command = `yt-dlp -o '${outputPath}' '${url}'`;

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      logWithTime(`⚠️ yt-dlp stderr: ${stderr}`);
    }

    if (stdout) {
      logWithTime(`ℹ️ yt-dlp stdout: ${stdout}`);
    }

    return outputPath;
  } catch (error) {
    logWithTime(`🔴 Error downloading YouTube video: ${error}`);
    throw error;
  }
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
    logWithTime(`🧹 Cleaned up file: ${filePath}`);
  } catch (error) {
    logWithTime(`⚠️ Error cleaning up file: ${error}`);
  }
}
