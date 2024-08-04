import fs from 'fs';
import path from 'path';

const API_KEYS_FILE = path.join(process.cwd(), '.ballistic', 'internals', 'api_keys.json');

interface APIKey {
  type: 'Claude' | 'OpenAI';
  key: string;
}

interface APIKeys {
  keys: APIKey[];
  selected: number | null;
}

export function readAPIKeys(): APIKeys {
  if (fs.existsSync(API_KEYS_FILE)) {
    const data = fs.readFileSync(API_KEYS_FILE, 'utf8');
    return JSON.parse(data);
  }
  return { keys: [], selected: null };
}

export function getSelectedAPIKey(): APIKey | null {
  const apiKeys = readAPIKeys();
  if (apiKeys.selected !== null && apiKeys.keys[apiKeys.selected]) {
    return apiKeys.keys[apiKeys.selected];
  }
  return null;
}