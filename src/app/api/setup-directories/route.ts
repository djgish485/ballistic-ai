import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUPERHERO_DIR = '.superhero';
const INTERNALS_DIR = 'internals';

function encodeProjectDir(projectDir: string): string {
  const basename = path.basename(projectDir);
  let encoded = basename.replace(/[^\w\-_.]/g, '_');
  if (!encoded[0].match(/[a-zA-Z_]/)) {
    encoded = '_' + encoded;
  }
  return encoded.slice(0, 255);
}

function getProjectSpecificDir(projectDir: string, type: 'files' | 'backups'): string {
  const encodedDir = encodeProjectDir(projectDir);
  return path.join(SUPERHERO_DIR, `${encodedDir}-${type}`);
}

export async function POST(request: Request) {
  console.log('Setup directories API route called');
  const { projectDir } = await request.json();
  console.log('Received project directory:', projectDir);
  
  const superheroDir = path.join(process.cwd(), SUPERHERO_DIR);
  const internalsDir = path.join(superheroDir, INTERNALS_DIR);
  const filesDir = path.join(process.cwd(), getProjectSpecificDir(projectDir, 'files'));
  const backupsDir = path.join(process.cwd(), getProjectSpecificDir(projectDir, 'backups'));

  const directories = [superheroDir, internalsDir, filesDir, backupsDir];

  const createdDirs: string[] = [];
  directories.forEach(dir => {
    console.log('Attempting to create directory:', dir);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
        createdDirs.push(dir);
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  });

  return NextResponse.json({ message: 'Directories setup complete', createdDirectories: createdDirs });
}