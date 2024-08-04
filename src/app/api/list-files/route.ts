import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectFilesDir, setupDirectories } from '@/utils/directoryUtils';

interface FileInfo {
  name: string;
  size: number;
  path: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectDir = searchParams.get('projectDir');

  if (!projectDir) {
    return NextResponse.json({ error: 'Project directory not provided' }, { status: 400 });
  }

  const superheroFilesDir = path.join(process.cwd(), getProjectFilesDir(projectDir));

  try {
    setupDirectories(projectDir);

    const fileNames = fs.readdirSync(superheroFilesDir);
    
    const files: FileInfo[] = fileNames.map(fileName => {
      const filePath = path.join(superheroFilesDir, fileName);
      const stats = fs.statSync(filePath);
      return {
        name: fileName,
        size: stats.size,
        path: path.relative(process.cwd(), filePath)
      };
    });

    const totalSize = files.reduce((acc, file) => acc + file.size, 0);

    console.log('Files found:', files);
    return NextResponse.json({ files, totalSize });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}