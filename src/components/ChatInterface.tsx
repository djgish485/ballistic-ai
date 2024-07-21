'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './ChatInterface.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemMessage {
  type: 'backup' | 'restore';
  content: string;
}

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const ChatInterface: React.FC<{ projectDir: string }> = ({ projectDir }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processStreamResponse = async (response: Response) => {
    console.log('Processing stream response');
    if (!response.body) {
      console.error('No response body');
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let currentContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      console.log('Received chunk:', chunk);

      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('Parsed data:', data);
            if (data.content) {
              currentContent += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1].content = currentContent;
                } else {
                  newMessages.push({ role: 'assistant', content: currentContent });
                }
                return newMessages;
              });
            } else if (data.conversationHistory) {
              console.log('Received conversation history:', data.conversationHistory);
              setMessages(data.conversationHistory);
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
          }
        }
      }
    }
    console.log('Stream processing completed');
  };

  const createBackup = async () => {
    try {
      const response = await fetch('/api/project-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir })
      });
      const data = await response.json();
      if (response.ok) {
        setHasBackup(true);
        setSystemMessages(prev => [
          ...prev,
          { type: 'backup', content: 'Project backup created. Previous backup (if any) was overwritten.' }
        ]);
      } else {
        throw new Error(data.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setSystemMessages(prev => [...prev, { type: 'backup', content: `Error creating backup: ${error.message}` }]);
    }
  };

  const handleStart = async () => {
    console.log('Start button clicked');
    setIsStarted(true);
    setMessages([]);
    setIsLoading(true);

    try {
      await createBackup();

      console.log('Analyzing project');
      const analyzeResponse = await fetch('/api/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir })
      });
      const analyzeData = await analyzeResponse.json();
      console.log('Analyze project response:', analyzeData);

      console.log('Starting chat');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir, isInitial: true, conversationHistory: [] })
      });

      await processStreamResponse(response);
    } catch (error) {
      console.error('Error starting chat:', error);
      setMessages([{ role: 'assistant', content: 'An error occurred while starting the chat.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      console.log('Sending message:', input);
      const userMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectDir, message: input, isInitial: false, conversationHistory: messages })
        });

        await processStreamResponse(response);
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred while processing your message.' }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRestore = async () => {
    if (!hasBackup) return;

    const confirmed = window.confirm('Are you sure you want to restore the project to the latest backup? This will replace your current project with the backup.');
    if (!confirmed) return;

    try {
      const response = await fetch('/api/project-backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir })
      });
      const data = await response.json();
      if (response.ok) {
        setMessages([]);
        setIsStarted(false);
        setHasBackup(false);
        setSystemMessages(prev => [...prev, { type: 'restore', content: 'Project restored successfully. You can start a new analysis by clicking the "Start" button.' }]);
      } else {
        throw new Error(data.error || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setSystemMessages(prev => [...prev, { type: 'restore', content: `Error restoring backup: ${error.message}` }]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex space-x-2">
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isStarted ? 'Next feature/fix' : 'Start'}
        </button>
        {hasBackup && (
          <button
            onClick={handleRestore}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Restore Latest Backup
          </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-100 rounded">
        {systemMessages.map((msg, index) => (
          <div key={`system-${index}`} className={`p-4 rounded ${styles.markdownContent} ${msg.type === 'backup' ? 'bg-blue-100' : 'bg-yellow-100'}`}>
            <strong>{msg.type === 'backup' ? 'Backup: ' : 'Restore: '}</strong>
            {msg.content}
          </div>
        ))}
        {messages.map((msg, index) => (
          <div key={`chat-${index}`} className={`p-4 rounded ${styles.markdownContent} ${msg.role === 'user' ? 'bg-blue-100' : 'bg-white'}`}>
            <strong>{msg.role === 'user' ? 'You: ' : 'AI: '}</strong>
            <FormattedMessage content={msg.content} />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 bg-gray-200 rounded-b">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow px-2 py-1 border rounded"
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
