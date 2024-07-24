import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectFilesDir, setupDirectories } from '@/utils/directoryUtils';

interface FileInfo {
  name: string;
  size: number;
  path: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
    console.log('Setting up directories');
    setupDirectories(projectDir);

    console.log('Attempting to read directory:', superheroFilesDir);
    const fileNames = fs.readdirSync(superheroFilesDir);
    
    const files: FileInfo[] = fileNames.map(fileName => {
      const filePath = path.join(superheroFilesDir, fileName);
      const stats = fs.statSync(filePath);
      return {
        name: fileName,
        size: stats.size,
        path: path.relative(process.cwd(), filePath) // Use relative path from project root
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
