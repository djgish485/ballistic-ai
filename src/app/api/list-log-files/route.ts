import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getProjectBackupsDir } from '@/utils/directoryUtils';

export async function GET(request: NextRequest) {
  const projectDir = request.nextUrl.searchParams.get('projectDir');

  if (!projectDir) {
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  try {
    const backupsDir = getProjectBackupsDir(projectDir);
    const fullPath = path.join(process.cwd(), backupsDir);
    const files = await fs.readdir(fullPath);
    const logFiles = files.filter(file => file.startsWith('message_log_') && file.endsWith('.json'));
    
    return NextResponse.json(logFiles);
  } catch (error) {
    console.error('Error listing log files:', error);
    return NextResponse.json({ error: 'Failed to list log files' }, { status: 500 });
  }
}
