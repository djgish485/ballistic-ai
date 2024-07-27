'use client';

import React, { useState } from 'react';
import FormattedMessage from './FormattedMessage';
import ImageThumbnail from './ImageThumbnail';
import styles from './ChatInterface.module.css';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

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
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ systemMessages, messages, onDiff, onEditMessage }) => {
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);

  const handleEditClick = (index: number) => {
    setEditingMessageIndex(index);
  };

  const handleConfirmEdit = (index: number) => {
    onEditMessage(index, messages[index].content);
    setEditingMessageIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
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
          {editingMessageIndex === index ? (
            <div className="mt-2">
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-2">
                <p className="font-bold">Warning: threading not implemented yet and all messages below will be forgotten.</p>
                <div className="mt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => handleConfirmEdit(index)}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <FormattedMessage 
              content={msg.content} 
              onDiff={onDiff} 
              role={msg.role}
              isComplete={msg.isComplete}
            />
          )}
          {msg.role === 'user' && hoveredMessageIndex === index && editingMessageIndex !== index && (
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
