import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getProjectBackupsDir } from '@/utils/directoryUtils';

export async function POST(request: NextRequest) {
  try {
    const { projectDir, messages, fileName } = await request.json();
    const backupsDir = getProjectBackupsDir(projectDir);
    const fullPath = path.join(process.cwd(), backupsDir, fileName);

    await fs.writeFile(fullPath, JSON.stringify(messages, null, 2));

    return NextResponse.json({ success: true, message: 'Message log saved successfully', fileName });
  } catch (error) {
    console.error('Error saving message log:', error);
    return NextResponse.json({ success: false, error: 'Failed to save message log' }, { status: 500 });
  }
}
