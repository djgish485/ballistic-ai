import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseCommand } from '@/utils/commandParser';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import EditCodePopup from './EditCodePopup';

interface ExecutionResult {
  id: string;
  output: string;
}

interface FormattedMessageProps {
  content: string;
  onDiff: (command: string) => void;
  role: 'user' | 'assistant';
  isComplete: boolean;
  onEditCommand: (oldCommand: string, newCommand: string) => void;
  messageIndex: number;
}

const CodeBlock = React.memo(({ node, inline, className, children, ...props }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(String(children));
  const [isRestored, setIsRestored] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = (newContent: string) => {
    setIsEditing(false);
    props.onEditCommand(String(children), newContent);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedContent(String(children));
  };

  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  } else {
    const nodeIndex = node.position?.start.line ?? Math.random();
    let id = props.codeBlockIds[nodeIndex];
    if (!id) {
      id = props.generateId();
      props.codeBlockIds[nodeIndex] = id;
    }

    const { filePath, newContent } = useMemo(() => parseCommand(String(children)), [children]);

    const handleRestore = async () => {
      const key = `${props.messageIndex}-${filePath}`;
      await props.handleRestore(filePath, props.originalFileContents[key]);
      setIsRestored(true);
    };

    return (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <pre
          ref={codeRef}
          className="bg-gray-100 p-4 rounded-lg"
          {...props}
        >
          <code>
            {String(children).replace(/\n$/, '')}
          </code>
        </pre>
        {!isEditing && isHovered && (
          <div
            className="absolute top-2 right-2"
          >
            <div className="p-1 rounded transition-colors duration-200 group hover:bg-blue-500">
              <PencilIcon
                className="h-6 w-6 text-gray-500 group-hover:text-white cursor-pointer"
                onClick={handleEditClick}
              />
            </div>
          </div>
        )}
        <EditCodePopup
          isOpen={isEditing}
          onClose={handleCancelClick}
          initialContent={String(children)}
          onSave={handleSaveClick}
        />
        {props.isComplete && !isEditing && (
          <>
            <div className="mt-2 space-x-2">
              <button
                onClick={() => {
                  props.handleExecute(String(children), id);
                  setIsRestored(false);
                }}
                className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Execute
              </button>
              <button
                onClick={() => props.handleDiffClick(String(children))}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Diff
              </button>
              {filePath && props.originalFileContents[`${props.messageIndex}-${filePath}`] && !isRestored && (
                <button
                  onClick={handleRestore}
                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Restore
                </button>
              )}
            </div>
            {!isRestored && (
              <div className="mt-2 bg-gray-100 p-2 rounded">
                {props.executionResults.find((res) => res.id === id)?.output}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
});

const FormattedMessage: React.FC<FormattedMessageProps> = React.memo(({ content, onDiff, role, isComplete, onEditCommand, messageIndex }) => {
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [codeBlockIds] = useState<Record<number, string>>({});
  const [originalFileContents, setOriginalFileContents] = useState<Record<string, string>>({});

  const generateId = useCallback(() => `code-${Math.random().toString(36).substr(2, 9)}`, []);

  const fetchFileContent = useCallback(async (filePath: string): Promise<string> => {
    const response = await fetch('/api/read-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch file content');
    }

    const data = await response.json();
    return data.content;
  }, []);

  const handleExecute = useCallback(async (code: string, id: string) => {
    try {
      const { filePath, newContent } = parseCommand(code);

      const key = `${messageIndex}-${filePath}`;
      if (filePath && !originalFileContents[key]) {
        const originalContent = await fetchFileContent(filePath);
        setOriginalFileContents(prevContents => ({
          ...prevContents,
          [key]: originalContent,
        }));
      }

      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      const linesCount = code.split('\n').length;

      setExecutionResults((prevResults) => {
        const newResult = { id, output: `Executed ${linesCount} lines of code.\n\n${result.output}` };
        return [...prevResults.filter((res) => res.id !== id), newResult];
      });
    } catch (error) {
      setExecutionResults((prevResults) => {
        const newResult = { id, output: 'Error executing code, please check the console for more details.' };
        return [...prevResults.filter((res) => res.id !== id), newResult];
      });
    }
  }, [fetchFileContent, originalFileContents, messageIndex]);

  const handleRestore = useCallback(async (filePath: string, originalContent: string) => {
    try {
      const response = await fetch('/api/restore-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: originalContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore original content');
      }

      alert('File restored successfully');
    } catch (error) {
      alert('Failed to restore file content');
    }
  }, []);

  const handleDiffClick = useCallback((code: string) => {
    onDiff(code);
  }, [onDiff]);

  const memoizedCodeBlock = useMemo(() => {
    return (props: any) => (
      <CodeBlock
        {...props}
        isComplete={isComplete}
        handleExecute={handleExecute}
        handleDiffClick={handleDiffClick}
        handleRestore={handleRestore}
        executionResults={executionResults}
        originalFileContents={originalFileContents}
        generateId={generateId}
        codeBlockIds={codeBlockIds}
        onEditCommand={onEditCommand}
        messageIndex={messageIndex}
      />
    );
  }, [isComplete, handleExecute, handleDiffClick, handleRestore, executionResults, originalFileContents, generateId, codeBlockIds, onEditCommand, messageIndex]);

  if (role === 'user') {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
  }

  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: memoizedCodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return prevProps.content === nextProps.content &&
         prevProps.role === nextProps.role &&
         prevProps.isComplete === nextProps.isComplete &&
         prevProps.messageIndex === nextProps.messageIndex;
});

FormattedMessage.displayName = 'FormattedMessage';

export default FormattedMessage;
