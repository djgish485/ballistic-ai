'use client';

import React from 'react';
import FormattedMessage from './FormattedMessage';
import ImageThumbnail from './ImageThumbnail';
import styles from './ChatInterface.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isComplete: boolean;
  images?: File[];
  apiType?: 'Claude 3.5 Sonnet' | 'GPT-4o';
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
          {msg.images && msg.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {msg.images.map((image, imgIndex) => (
                <ImageThumbnail key={imgIndex} file={image} />
              ))}
            </div>
          )}
          <strong>{msg.role === 'user' ? 'You: ' : `${msg.apiType}: `}</strong>
          <FormattedMessage 
            content={msg.content} 
            onDiff={onDiff} 
            role={msg.role}
            isComplete={msg.isComplete}
          />
        </div>
      ))}
    </>
  );
};

export default ChatMessages;
