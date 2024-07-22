export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SystemMessage {
  type: 'backup' | 'restore';
  content: string;
}
