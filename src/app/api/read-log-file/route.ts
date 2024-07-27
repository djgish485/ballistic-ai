import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getProjectBackupsDir } from '@/utils/directoryUtils';

export async function POST(request: NextRequest) {
  try {
    const { projectDir, fileName } = await request.json();

    if (!projectDir || !fileName) {
      return NextResponse.json({ error: 'Project directory and file name are required' }, { status: 400 });
    }

    const backupsDir = getProjectBackupsDir(projectDir);
    const filePath = path.join(process.cwd(), backupsDir, fileName);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsedContent = JSON.parse(fileContent);

    return NextResponse.json({ content: parsedContent });
  } catch (error) {
    console.error('Error reading log file:', error);
    return NextResponse.json({ error: 'Failed to read log file' }, { status: 500 });
  }
}
