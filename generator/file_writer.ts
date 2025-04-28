// generator/file_writer.ts

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Writes content to a file, ensuring the directory exists.
 * @param filePath The file path to write to.
 * @param content The content to write.
 */
export function writeToFile(filePath: string, content: string): void {
  const dir = dirname(filePath);

  try {
    mkdirSync(dir, { recursive: true }); // make sure directory exists
  } catch (err) {
    console.error(`Failed to create directory for ${filePath}`, err);
    throw err;
  }

  try {
    writeFileSync(filePath, content);
    console.log(`✅ Wrote: ${filePath}`);
  } catch (err) {
    console.error(`❌ Failed to write to ${filePath}`, err);
    throw err;
  }
}
