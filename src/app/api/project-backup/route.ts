import { NextResponse } from 'next/server';
import { createProjectBackup, restoreProjectBackup, getProjectBackupsDir } from '@/utils/directoryUtils';
import path from 'path';

export async function POST(request: Request) {
  const { projectDir } = await request.json();

  try {
    const backupDir = createProjectBackup(projectDir);
    return NextResponse.json({ message: 'Backup created successfully', backupDir });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
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