import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectSettingsDir } from '@/utils/directoryUtils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectDir = searchParams.get('projectDir');

  if (!projectDir) {
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  const settingsDir = getProjectSettingsDir(projectDir);
  const settingsFile = path.join(settingsDir, 'dynamic-context.json');

  if (fs.existsSync(settingsFile)) {
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    return NextResponse.json(settings);
  }

  return NextResponse.json({ isDynamicContext: false });
}

export async function POST(request: Request) {
  const { projectDir, isDynamicContext } = await request.json();

  if (!projectDir) {
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  const settingsDir = getProjectSettingsDir(projectDir);
  const settingsFile = path.join(settingsDir, 'dynamic-context.json');

  const settings = { isDynamicContext };

  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));

  return NextResponse.json({ message: 'Dynamic Context preference saved successfully' });
}