import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseCommand } from '@/utils/commandParser';
import { PencilIcon } from '@heroicons/react/24/solid';
import EditCodePopup from './EditCodePopup';

interface FormattedMessageProps {
  content: string;
  onDiff: (filePath: string, newContent: string) => void;
  role: 'user' | 'assistant';
  isComplete: boolean;
  onEditCommand: (oldCommand: string, newCommand: string) => void;
  messageIndex: number;
}

const CodeBlock = React.memo(({ node, inline, className, children, ...props }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [canRestore, setCanRestore] = useState(false);
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

    const previousLine = props.getPreviousLine(nodeIndex);
    const { filePath, newContent } = useMemo(() => parseCommand(String(children), previousLine), [children, previousLine]);

    const handleRestore = async () => {
      if (filePath) {
        const key = `${props.messageIndex}-${id}`;
        const originalContent = props.originalFileContents[key];
        if (originalContent) {
          await props.handleRestore(filePath, originalContent);
          setIsRestored(true);
          setCanRestore(false);
        }
      }
    };

    const handleExecute = async () => {
      if (filePath) {
        try {
          const key = `${props.messageIndex}-${id}`;
          if (!props.originalFileContents[key]) {
            const originalContent = await props.fetchFileContent(filePath);
            props.setOriginalFileContent(key, originalContent);
          }

          // Check if the code appears to be truncated
          const truncationPatterns = [
            /Rest of the file remains unchanged\.\.\./i,
            /# Rest of the script contents\.\.\./i,
            /\/\/ Rest of the function\.\.\./i,
            /\/\/ \.\.\. \(previous code remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the function remains unchanged\)/i,
            /\/\/ \.\.\. \(rest of the file remains unchanged\)/i
          ];

          const isTruncated = truncationPatterns.some(pattern => pattern.test(newContent));

          if (isTruncated) {
            const confirmMessage = `The code appears to be truncated. Would you like to proceed?\n\nRemind the AI to show the full file when making modifications.`;
            if (!window.confirm(confirmMessage)) {
              return;
            }
          }

          const response = await fetch('/api/write-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content: newContent }),
          });
          if (!response.ok) throw new Error('Failed to write file');
          props.setExecutionResult(id, `File ${filePath} updated successfully.`);
          setCanRestore(true);
        } catch (error) {
          props.setExecutionResult(id, `Error updating file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        try {
          const response = await fetch('/api/execute-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: String(children) }),
          });
          const result = await response.json();
          props.setExecutionResult(id, result.output);
        } catch (error) {
          props.setExecutionResult(id, `Error executing code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      setIsRestored(false);
    };

    useEffect(() => {
      const key = `${props.messageIndex}-${id}`;
      if (props.originalFileContents[key]) {
        setCanRestore(true);
      }
    }, [props.originalFileContents, props.messageIndex, id]);

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
          <div className="absolute top-2 right-2">
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
                onClick={handleExecute}
                className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Execute
              </button>
              {filePath && (
                <button
                  onClick={() => props.handleDiffClick(filePath, newContent)}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Diff
                </button>
              )}
              {canRestore && (
                <button
                  onClick={handleRestore}
                  className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Restore
                </button>
              )}
            </div>
            {!isRestored && props.executionResults[id] && (
              <div className="mt-2 bg-gray-100 p-2 rounded">
                {props.executionResults[id]}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
});

const FormattedMessage: React.FC<FormattedMessageProps> = React.memo(({ content, onDiff, role, isComplete, onEditCommand, messageIndex }) => {
  const [executionResults, setExecutionResults] = useState<Record<string, string>>({});
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

  const setExecutionResult = useCallback((id: string, result: string) => {
    setExecutionResults(prev => ({ ...prev, [id]: result }));
  }, []);

  const setOriginalFileContent = useCallback((key: string, content: string) => {
    setOriginalFileContents(prev => ({ ...prev, [key]: content }));
  }, []);

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

  const handleDiffClick = useCallback((filePath: string, newContent: string) => {
    onDiff(filePath, newContent);
  }, [onDiff]);

  const getPreviousLine = useCallback((nodeIndex: number) => {
    const lines = content.split('\n');
    return lines[nodeIndex - 2] || '';
  }, [content]);

  const memoizedCodeBlock = useMemo(() => {
    return (props: any) => (
      <CodeBlock
        {...props}
        isComplete={isComplete}
        setExecutionResult={setExecutionResult}
        handleDiffClick={handleDiffClick}
        handleRestore={handleRestore}
        executionResults={executionResults}
        originalFileContents={originalFileContents}
        setOriginalFileContent={setOriginalFileContent}
        generateId={generateId}
        codeBlockIds={codeBlockIds}
        onEditCommand={onEditCommand}
        messageIndex={messageIndex}
        getPreviousLine={getPreviousLine}
        fetchFileContent={fetchFileContent}
      />
    );
  }, [isComplete, setExecutionResult, handleDiffClick, handleRestore, executionResults, originalFileContents, setOriginalFileContent, generateId, codeBlockIds, onEditCommand, messageIndex, getPreviousLine, fetchFileContent]);

  if (role === 'user') {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;
  }

  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h4>{children}</h4>,  // Convert h1 to h4
          code: memoizedCodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.role === nextProps.role &&
         prevProps.isComplete === nextProps.isComplete &&
         prevProps.messageIndex === nextProps.messageIndex;
});

FormattedMessage.displayName = 'FormattedMessage';

export default FormattedMessage;