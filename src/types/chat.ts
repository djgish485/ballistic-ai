export interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: File[];
}

export interface SystemMessage {
  type: 'backup' | 'restore';
  content: string;
}
