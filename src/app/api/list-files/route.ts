import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectFilesDir } from '@/utils/directoryUtils';

export async function GET(request: Request) {
  console.log('List files API route called');
  const { searchParams } = new URL(request.url);
  const projectDir = searchParams.get('projectDir');

  console.log('Received project directory:', projectDir);

  if (!projectDir) {
    console.log('Error: Project directory not provided');
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  const superheroFilesDir = path.join(process.cwd(), getProjectFilesDir(projectDir));
  console.log('Superhero files directory:', superheroFilesDir);

  try {
    console.log('Attempting to read directory:', superheroFilesDir);
    const files = fs.readdirSync(superheroFilesDir);
    console.log('Files found:', files);
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
