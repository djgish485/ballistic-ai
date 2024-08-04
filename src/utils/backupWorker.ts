const { parentPort, workerData } = require('worker_threads');
const fs = require('fs/promises');
const path = require('path');

async function copyRecursive(src, dest) {
  const stats = await fs.stat(src);
  if (stats.isDirectory()) {
    if (path.basename(src) !== '.superhero') {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src);
      await Promise.all(entries.map(entry => copyRecursive(path.join(src, entry), path.join(dest, entry))));
    }
  } else {
    await fs.copyFile(src, dest);
  }
}

async function createBackup(projectDir, backupDir) {
  try {
    await fs.rm(backupDir, { recursive: true, force: true });
    await fs.mkdir(backupDir, { recursive: true });
    await copyRecursive(projectDir, backupDir);
    parentPort.postMessage({ status: 'completed', backupDir });
  } catch (error) {
    parentPort.postMessage({ status: 'error', error: error.message });
  }
}

if (workerData && workerData.projectDir && workerData.backupDir) {
  createBackup(workerData.projectDir, workerData.backupDir);
}