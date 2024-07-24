import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectSettingsDir } from '@/utils/directoryUtils';

const DEFAULT_SETTINGS = {
  includePaths: ['components', 'GenAI_creativity_scripts'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', '.vscode', '.idea', 'venv', 'superhero_env', '__pycache__', 'example_project'],
  fileExtensions: 'py|txt|md|json|js|ts|tsx|html|css|scss|less|xml|yml|yaml|ini|cfg|sh|bat|java|c|cpp|h|hpp|cs|rb|php|swift|kt|dart|rs|go|pl|lua|r|jl'
};

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
