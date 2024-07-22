'use client';

import React from 'react';
import FormattedMessage from './FormattedMessage';
import styles from './ChatInterface.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemMessage {
  type: 'backup' | 'restore' | 'analysis';
  content: string;
}

interface ChatMessagesProps {
  systemMessages: SystemMessage[];
  messages: Message[];
  onDiff: (filePath: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ systemMessages, messages, onDiff }) => {
  return (
    <>
      {systemMessages.map((msg, index) => (
        <div
          key={`system-${index}`}
          className={`p-4 rounded ${styles.markdownContent} ${
            msg.type === 'restore' ? 'bg-yellow-100' : 'bg-blue-100'
          }`}
        >
          {msg.type === 'backup' && <strong></strong>}
          {msg.type === 'restore' && <strong>Restore: </strong>}
          {msg.content}
        </div>
      ))}
      {messages.map((msg, index) => (
        <div
          key={`chat-${index}`}
          className={`p-4 rounded ${styles.markdownContent} ${
            msg.role === 'user' ? 'bg-blue-100' : 'bg-white'
          }`}
        >
          <strong>{msg.role === 'user' ? 'You: ' : 'AI: '}</strong>
          <FormattedMessage content={msg.content} onDiff={onDiff} />
        </div>
      ))}
    </>
  );
};

export default ChatMessages;