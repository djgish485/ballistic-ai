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

function shouldExcludeStructure(basename: string, fullPath: string, projectDir: string, settings: any): boolean {
  const excludeDirs = new Set(settings.excludeDirs);
  const excludeFiles = new Set(['.DS_Store']);
  return excludeDirs.has(basename) || excludeFiles.has(basename) || basename.startsWith('.');
}

function isReadmeFile(basename: string): boolean {
  const readmePatterns = [
    /^readme(\.md|\.txt|\.rst)?$/i,
    /^read\.me$/i,
    /^readme\.(markdown|mdown|mkdn|mkd)$/i
  ];
  return readmePatterns.some(pattern => pattern.test(basename));
}

function shouldExcludeContent(basename: string, fullPath: string, projectDir: string, settings: any, isDynamicContext: boolean): boolean {
  console.log(`Checking file: ${basename}, isDynamicContext: ${isDynamicContext}`);
  if (!isPathIncluded(fullPath, settings.includePaths)) {
    console.log(`${basename} not in includePaths`);
    return true;
  }
  if (isDynamicContext && !isReadmeFile(basename)) {
    console.log(`${basename} is not a README file`);
    return true;
  }
  if (shouldExcludeStructure(basename, fullPath, projectDir, settings)) {
    console.log(`${basename} excluded by structure rules`);
    return true;
  }
  console.log(`${basename} will be included`);
  return false;
}

export async function POST(request: Request) {
  const { projectDir } = await request.json();
  
  const settings = getSettings(projectDir);
  
  const ballisticFilesDir = path.join(process.cwd(), getProjectFilesDir(projectDir));
  const structureFile = path.join(ballisticFilesDir, 'project-structure.txt');
  const contentFile = path.join(ballisticFilesDir, 'project-content.txt');

  // Get dynamic context setting
  const dynamicContextSettingsFile = path.join(getProjectSettingsDir(projectDir), 'dynamic-context.json');
  let isDynamicContext = false;
  if (fs.existsSync(dynamicContextSettingsFile)) {
    const dynamicContextSettings = JSON.parse(fs.readFileSync(dynamicContextSettingsFile, 'utf-8'));
    isDynamicContext = dynamicContextSettings.isDynamicContext;
  }
  console.log(`Dynamic Context is ${isDynamicContext ? 'enabled' : 'disabled'}`);

  // Analyze project structure
  let structureContent = `Project Structure:\n=================\n\nRoot: ${projectDir}\n\n`;
  function analyzeStructure(dir: string, level: number = 0) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.relative(projectDir, fullPath);
      const indent = '  '.repeat(level);
      if (shouldExcludeStructure(item, fullPath, projectDir, settings)) continue;
      if (fs.statSync(fullPath).isDirectory()) {
        structureContent += `${indent}${item}/\n`;
        analyzeStructure(fullPath, level + 1);
      } else {
        structureContent += `${indent}${item}\n`;
      }
    }
  }
  analyzeStructure(projectDir);
  
  fs.writeFileSync(structureFile, structureContent);

  // Analyze project content
  let contentContent = `Project Content:\n================\n\n`;
  let fileCount = 0;
  function analyzeContent(dir: string) {
    console.log(`Analyzing directory: ${dir}`);
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (shouldExcludeContent(item, fullPath, projectDir, settings, isDynamicContext)) continue;
      if (fs.statSync(fullPath).isDirectory()) {
        analyzeContent(fullPath);
      } else if (item.match(new RegExp(`\\.(${settings.fileExtensions})$`, 'i')) || isReadmeFile(item)) {
        console.log(`Including file: ${fullPath}`);
        contentContent += `File: ${fullPath}\n${'='.repeat(fullPath.length + 6)}\n`;
        try {
          contentContent += fs.readFileSync(fullPath, 'utf8') + '\n\n';
          fileCount++;
        } catch (error) {
          contentContent += `Error reading file: ${error}\n\n`;
        }
      }
    }
  }

  function analyzeContentDynamic(dir: string) {
    console.log(`Analyzing directory (dynamic): ${dir}`);
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!shouldExcludeStructure(item, fullPath, projectDir, settings)) {
          analyzeContentDynamic(fullPath);
        }
      } else if (isReadmeFile(item) && !shouldExcludeContent(item, fullPath, projectDir, settings, isDynamicContext)) {
        console.log(`Including README file: ${fullPath}`);
        contentContent += `File: ${fullPath}\n${'='.repeat(fullPath.length + 6)}\n`;
        try {
          contentContent += fs.readFileSync(fullPath, 'utf8') + '\n\n';
          fileCount++;
        } catch (error) {
          contentContent += `Error reading file: ${error}\n\n`;
        }
      }
    }
  }

  if (isDynamicContext) {
    analyzeContentDynamic(projectDir);
  } else {
    analyzeContent(projectDir);
  }
  
  console.log(`Content to be written:\n${contentContent}`);
  fs.writeFileSync(contentFile, contentContent);

  return NextResponse.json({ message: `${fileCount} files added to project context` });
}