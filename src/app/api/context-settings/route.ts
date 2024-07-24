import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectSettingsDir } from '@/utils/directoryUtils';
import { DEFAULT_SETTINGS } from '@/utils/settings';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectDir = searchParams.get('projectDir');

  if (!projectDir) {
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  const settingsDir = getProjectSettingsDir(projectDir);
  const settingsFile = path.join(settingsDir, 'context-settings.json');

  if (fs.existsSync(settingsFile)) {
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    return NextResponse.json(settings);
  }

  return NextResponse.json(DEFAULT_SETTINGS);
}

export async function POST(request: Request) {
  const { projectDir, includePaths, excludeDirs, fileExtensions } = await request.json();

  if (!projectDir) {
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  const settingsDir = getProjectSettingsDir(projectDir);
  const settingsFile = path.join(settingsDir, 'context-settings.json');

  const settings = {
    includePaths,
    excludeDirs,
    fileExtensions
  };

  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));

  return NextResponse.json({ message: 'Settings saved successfully' });
}
