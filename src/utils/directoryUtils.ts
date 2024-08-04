import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';

export const INTERNALS_DIR = '.ballistic/internals';

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
  return path.join('.ballistic', `${encodedDir}-files`);
}

export function getProjectBackupsDir(projectDir: string): string {
  const encodedDir = encodeProjectDir(projectDir);
  return path.join('.ballistic', `${encodedDir}-backups`);
}

export function getProjectSettingsDir(projectDir: string): string {
  const encodedDir = encodeProjectDir(projectDir);
  return path.join('.ballistic', `${encodedDir}-settings`);
}

export function getMessageLogPath(projectDir: string): string {
  const backupsDir = getProjectBackupsDir(projectDir);
  return path.join(process.cwd(), backupsDir, 'message_log.json');
}

export function setupDirectories(projectDir: string): void {
  const directories = [
    INTERNALS_DIR,
    getProjectFilesDir(projectDir),
    getProjectBackupsDir(projectDir),
    getProjectSettingsDir(projectDir)
  ];

  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${fullPath}:`, error);
      }
    }
  });
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
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.mkdirSync(projectDir, { recursive: true });

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

  setupDirectories(projectDir);
}