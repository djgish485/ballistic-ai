import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUPERHERO_DIR = '.superhero';

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

function shouldExclude(basename: string): boolean {
  const excludeDirs = new Set(['node_modules', '.git', 'dist', 'build', '.vscode', '.idea', 'venv', 'superhero_env', '__pycache__', 'example_project', 'package-lock.json']);
  const excludeFiles = new Set(['.DS_Store']);
  return excludeDirs.has(basename) || excludeFiles.has(basename) || basename.startsWith('.');
}

export async function POST(request: Request) {
  console.log('Analyze project API route called');
  const { projectDir } = await request.json();
  console.log('Received project directory:', projectDir);
  
  const superheroFilesDir = path.join(process.cwd(), getProjectSpecificDir(projectDir, 'files'));
  const structureFile = path.join(superheroFilesDir, 'project-structure.txt');
  const contentFile = path.join(superheroFilesDir, 'project-content.txt');

  console.log('Structure file path:', structureFile);
  console.log('Content file path:', contentFile);

  // Analyze project structure
  let structureContent = `Project Structure:\n=================\n\nRoot: ${projectDir}\n\n`;
  let fileCount = 0;
  function analyzeStructure(dir: string, level: number = 0) {
    console.log(`Analyzing structure of: ${dir}`);
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (shouldExclude(item)) continue;
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(projectDir, fullPath);
      const indent = '  '.repeat(level);
      if (fs.statSync(fullPath).isDirectory()) {
        structureContent += `${indent}${item}/\n`;
        analyzeStructure(fullPath, level + 1);
      } else {
        structureContent += `${indent}${item}\n`;
        fileCount++;
      }
    }
  }
  analyzeStructure(projectDir);
  
  console.log('Writing structure file');
  fs.writeFileSync(structureFile, structureContent);

  // Analyze project content
  let contentContent = `Project Content:\n================\n\n`;
  function analyzeContent(dir: string) {
    console.log(`Analyzing content of: ${dir}`);
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (shouldExclude(item)) continue;
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(projectDir, fullPath);
      if (fs.statSync(fullPath).isDirectory()) {
        analyzeContent(fullPath);
      } else if (item.match(/\.(py|txt|md|json|js|ts|tsx|html|css|scss|less|xml|yml|yaml|ini|cfg|sh|bat|java|c|cpp|h|hpp|cs|rb|php|swift|kt|dart|rs|go|pl|lua|r|jl)$/)) {
        contentContent += `File: ${relativePath}\n${'='.repeat(relativePath.length + 6)}\n`;
        try {
          contentContent += fs.readFileSync(fullPath, 'utf8') + '\n\n';
        } catch (error) {
          contentContent += `Error reading file: ${error}\n\n`;
        }
      }
    }
  }
  analyzeContent(projectDir);
  
  console.log('Writing content file');
  fs.writeFileSync(contentFile, contentContent);

  return NextResponse.json({ message: `${fileCount} files added to project context` });
}