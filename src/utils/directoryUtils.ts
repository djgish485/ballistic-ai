import fs from 'fs';
import path from 'path';

export const INTERNALS_DIR = '.superhero/internals';

export function encodeProjectDir(projectDir: string): string {
  const basename = path.basename(projectDir);
  let encoded = basename.replace(/[^\w\-_.]/g, '_');
  if (!encoded[0].match(/[a-zA-Z_]/)) {
    encoded = '_' + encoded;
  }
  return encoded.slice(0, 255);
}

export function getProjectFilesDir(projectDir: string): string {
  const encodedDir = encodeProjectDir(projectDir);
  return path.join('.superhero', `${encodedDir}-files`);
}

export function getProjectBackupsDir(projectDir: string): string {
  const encodedDir = encodeProjectDir(projectDir);
  return path.join('.superhero', `${encodedDir}-backups`);
}

export function setupDirectories(projectDir: string): void {
  const directories = [
    INTERNALS_DIR,
    getProjectFilesDir(projectDir),
    getProjectBackupsDir(projectDir)
  ];

  directories.forEach(dir => {
    const fullPath = path.join(projectDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created directory: ${fullPath}`);
    }
  });
}
