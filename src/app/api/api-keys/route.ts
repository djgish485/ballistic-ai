import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const API_KEYS_FILE = path.join(process.cwd(), '.superhero', 'internals', 'api_keys.json');

interface APIKeys {
  keys: { type: string; key: string }[];
  selected: number | null;
}

function readAPIKeys(): APIKeys {
  if (fs.existsSync(API_KEYS_FILE)) {
    const data = fs.readFileSync(API_KEYS_FILE, 'utf8');
    return JSON.parse(data);
  }
  return { keys: [], selected: null };
}

function writeAPIKeys(apiKeys: APIKeys) {
  fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
}

export async function GET() {
  const apiKeys = readAPIKeys();
  return NextResponse.json(apiKeys);
}

export async function POST(request: Request) {
  const { type, key } = await request.json();
  const apiKeys = readAPIKeys();
  apiKeys.keys.push({ type, key });
  if (apiKeys.keys.length === 1) {
    apiKeys.selected = 0;
  }
  writeAPIKeys(apiKeys);
  return NextResponse.json({ message: 'API key added successfully' });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const index = parseInt(searchParams.get('index') || '');
  if (isNaN(index)) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
  }

  const apiKeys = readAPIKeys();
  apiKeys.keys.splice(index, 1);
  if (apiKeys.selected === index) {
    apiKeys.selected = apiKeys.keys.length > 0 ? 0 : null;
  } else if (apiKeys.selected !== null && apiKeys.selected > index) {
    apiKeys.selected--;
  }
  writeAPIKeys(apiKeys);
  return NextResponse.json({ message: 'API key deleted successfully' });
}

export async function PUT(request: Request) {
  const { selected } = await request.json();
  const apiKeys = readAPIKeys();
  if (selected >= 0 && selected < apiKeys.keys.length) {
    apiKeys.selected = selected;
    writeAPIKeys(apiKeys);
    return NextResponse.json({ message: 'API key selected successfully' });
  }
  return NextResponse.json({ error: 'Invalid selection' }, { status: 400 });
}
