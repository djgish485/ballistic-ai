import { NextResponse } from 'next/server';
import { createProjectBackupAsync, restoreProjectBackup, getProjectBackupsDir } from '@/utils/directoryUtils';
import path from 'path';

export async function POST(request: Request) {
  const { projectDir } = await request.json();

  try {
    createProjectBackupAsync(projectDir)
      .then((backupDir) => {
        console.log('Backup completed:', backupDir);
      })
      .catch((error) => {
        console.error('Backup failed:', error);
      });

    return NextResponse.json({ message: 'Backup process started' });
  } catch (error) {
    console.error('Error initiating backup:', error);
    return NextResponse.json({ error: 'Failed to initiate backup' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { projectDir } = await request.json();
  const backupBaseDir = getProjectBackupsDir(projectDir);
  const backupDir = path.join(backupBaseDir, 'latest_backup');

  try {
    restoreProjectBackup(projectDir, backupDir);
    return NextResponse.json({ message: 'Project restored successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
