'use client';

import React from 'react';
import FormattedMessage from './FormattedMessage';
import styles from './ChatInterface.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemMessage {
  type: 'backup' | 'restore';
  content: string;
}

interface ChatMessagesProps {
  systemMessages: SystemMessage[];
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ systemMessages, messages }) => {
  return (
    <>
      {systemMessages.map((msg, index) => (
        <div
          key={`system-${index}`}
          className={`p-4 rounded ${styles.markdownContent} ${
            msg.type === 'backup' ? 'bg-blue-100' : 'bg-yellow-100'
          }`}
        >
          <strong>{msg.type === 'backup' ? 'Backup: ' : 'Restore: '}</strong>
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
          <FormattedMessage content={msg.content} />
        </div>
      ))}
    </>
  );
};

export default ChatMessages;
