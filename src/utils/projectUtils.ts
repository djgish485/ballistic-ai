import fs from 'fs';
import path from 'path';
import { getProjectFilesDir } from './directoryUtils';

export async function getProjectFiles(projectDir: string): Promise<string> {
  const ballisticFilesDir = getProjectFilesDir(projectDir);
  let projectFiles = '';

  // Read all files in the ballistic files directory
  const files = fs.readdirSync(ballisticFilesDir);

  for (const file of files) {
    const filePath = path.join(ballisticFilesDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      // Check if the file is a text file (you can expand this list if needed)
      const textFileExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.yml', '.yaml'];
      if (textFileExtensions.includes(path.extname(file).toLowerCase())) {
        projectFiles += `File: ${file}\n${'='.repeat(file.length + 6)}\n`;
        projectFiles += `${fs.readFileSync(filePath, 'utf-8')}\n\n`;
      }
    }
  }

  return projectFiles;
}