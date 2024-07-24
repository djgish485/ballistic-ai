import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectFilesDir, getProjectSettingsDir } from '@/utils/directoryUtils';
import { DEFAULT_SETTINGS } from '@/utils/settings';

function getSettings(projectDir: string) {
  const settingsDir = getProjectSettingsDir(projectDir);
  const settingsFile = path.join(settingsDir, 'context-settings.json');

  if (fs.existsSync(settingsFile)) {
    return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  }

  return DEFAULT_SETTINGS;
}

function encodeProjectDir(projectDir: string): string {
  const basename = path.basename(projectDir);
  let encoded = basename.replace(/[^\w\-_.]/g, '_');
  if (!encoded[0].match(/[a-zA-Z_]/)) {
    encoded = '_' + encoded;
  }
  return encoded.slice(0, 255);
}

function isPathIncluded(fullPath: string, includePaths: string[]) {
  if (includePaths.length === 0) {
    return true;
  }

  const fileRegex = /\.[0-9a-z]+$/i;

  if (!fileRegex.test(fullPath)) {
    return true;
  }

  for (const includePath of includePaths) {
    if (fullPath.includes(includePath)) {
      return true;
    }
  }
  return false;
}

function shouldExclude(basename: string, fullPath: string, projectDir: string, settings: any): boolean {
  const excludeDirs = new Set(settings.excludeDirs);
  const excludeFiles = new Set(['.DS_Store']);
  if (!isPathIncluded(fullPath, settings.includePaths)) {
    return true;
  }
  return excludeDirs.has(basename) || excludeFiles.has(basename) || basename.startsWith('.');
}

export async function POST(request: Request) {
  console.log('Analyze project API route called');
  const { projectDir } = await request.json();
  console.log('Received project directory:', projectDir);
  
  const settings = getSettings(projectDir);
  
  const superheroFilesDir = path.join(process.cwd(), getProjectFilesDir(projectDir));
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
      const fullPath = path.join(dir, item);
      if (shouldExclude(item, fullPath, projectDir, settings)) continue;
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
      const fullPath = path.join(dir, item);
      if (shouldExclude(item, fullPath, projectDir, settings)) continue;
      const relativePath = path.relative(projectDir, fullPath);
      if (fs.statSync(fullPath).isDirectory()) {
        analyzeContent(fullPath);
      } else if (item.match(new RegExp(`\\.(${settings.fileExtensions})$`, 'i'))) {
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
