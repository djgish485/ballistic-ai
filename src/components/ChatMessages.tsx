'use client';

import React, { useState } from 'react';
import FormattedMessage from './FormattedMessage';
import ImageThumbnail from './ImageThumbnail';
import styles from './ChatInterface.module.css';
import { PencilIcon } from '@heroicons/react/24/solid';

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
  onEditMessage: (index: number, newContent: string) => void;
  onEditCommand: (oldCommand: string, newCommand: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ systemMessages, messages, onDiff, onEditMessage, onEditCommand }) => {
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);

  const handleEditClick = (index: number) => {
    const confirmMessage = "Warning: threading not implemented yet and all messages below will be forgotten. Do you want to proceed?";
    if (window.confirm(confirmMessage)) {
      onEditMessage(index, messages[index].content);
    }
  };

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
          } relative`}
          onMouseEnter={() => setHoveredMessageIndex(index)}
          onMouseLeave={() => setHoveredMessageIndex(null)}
        >
          {msg.images && msg.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {msg.images.map((image, imgIndex) => (
                <ImageThumbnail key={imgIndex} file={image} />
              ))}
            </div>
          )}
          <strong>{msg.role === 'user' ? '' : `${msg.apiType}: `}</strong>
          <FormattedMessage 
            content={msg.content} 
            onDiff={onDiff} 
            role={msg.role}
            isComplete={msg.isComplete}
            onEditCommand={onEditCommand}
          />
          {msg.role === 'user' && hoveredMessageIndex === index && (
            <PencilIcon
              className="h-5 w-5 absolute top-2 right-2 text-gray-500 cursor-pointer"
              onClick={() => handleEditClick(index)}
            />
          )}
        </div>
      ))}
    </>
  );
};

export default ChatMessages;
