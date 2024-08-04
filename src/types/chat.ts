export interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: File[];
  isComplete: boolean;
  apiType?: 'Claude 3.5 Sonnet' | 'GPT-4o';
}

export type SystemMessageType = 'backup' | 'restore' | 'analysis' | 'error';

export interface SystemMessage {
  type: SystemMessageType;
  content: string;
}