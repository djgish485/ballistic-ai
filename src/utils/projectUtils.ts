import fs from 'fs';
import path from 'path';
import { getProjectFilesDir } from './directoryUtils';

export async function getProjectFiles(projectDir: string): Promise<string> {
  const superheroFilesDir = getProjectFilesDir(projectDir);
  const structureFile = path.join(superheroFilesDir, 'project-structure.txt');
  const contentFile = path.join(superheroFilesDir, 'project-content.txt');

  let projectFiles = '';

  if (fs.existsSync(structureFile)) {
    projectFiles += `${fs.readFileSync(structureFile, 'utf-8')}\n\n`;
  }

  if (fs.existsSync(contentFile)) {
    projectFiles += `${fs.readFileSync(contentFile, 'utf-8')}`;
  }

  return projectFiles;
}
