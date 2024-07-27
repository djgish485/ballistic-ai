import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';

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

export function getProjectSettingsDir(projectDir: string): string {
  const encodedDir = encodeProjectDir(projectDir);
  return path.join('.superhero', `${encodedDir}-settings`);
}

export function getMessageLogPath(projectDir: string): string {
  const backupsDir = getProjectBackupsDir(projectDir);
  return path.join(process.cwd(), backupsDir, 'message_log.json');
}

export function setupDirectories(projectDir: string): void {
  console.log('Setting up directories for project:', projectDir);
  const directories = [
    INTERNALS_DIR,
    getProjectFilesDir(projectDir),
    getProjectBackupsDir(projectDir),
    getProjectSettingsDir(projectDir)
  ];

  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    console.log('Attempting to create directory:', fullPath);
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created directory: ${fullPath}`);
      } catch (error) {
        console.error(`Error creating directory ${fullPath}:`, error);
      }
    } else {
      console.log(`Directory already exists: ${fullPath}`);
    }
  });
  console.log('Directory setup complete');
}

export function createProjectBackupAsync(projectDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const backupBaseDir = getProjectBackupsDir(projectDir);
    const backupDir = path.join(backupBaseDir, 'latest_backup');

    const worker = new Worker(path.join(process.cwd(), 'src', 'utils', 'backupWorker.ts'), {
      workerData: { projectDir, backupDir }
    });

    worker.on('message', (message) => {
      if (message.status === 'completed') {
        resolve(message.backupDir);
      } else if (message.status === 'error') {
        reject(new Error(message.error));
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Backup worker stopped with exit code ${code}`));
      }
    });
  });
}

export function restoreProjectBackup(projectDir: string, backupDir: string): void {
  // Clear the project directory
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.mkdirSync(projectDir, { recursive: true });

  // Copy the backup to the project directory
  const copyRecursive = (src: string, dest: string) => {
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  copyRecursive(backupDir, projectDir);

  // Recreate .superhero directory if it doesn't exist after restoration
  setupDirectories(projectDir);
}
