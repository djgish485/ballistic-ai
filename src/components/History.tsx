import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface HistoryProps {
  projectDir: string;
}

interface LogEntry {
  role: string;
  content: string;
  apiType?: string;
}

const History: React.FC<HistoryProps> = ({ projectDir }) => {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [showLogContent, setShowLogContent] = useState(false);
  const [logContent, setLogContent] = useState<LogEntry[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogFiles();
  }, [projectDir]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        handlePopupClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchLogFiles = async () => {
    try {
      const response = await fetch(`/api/list-log-files?projectDir=${encodeURIComponent(projectDir)}`);
      if (response.ok) {
        const files = await response.json();
        setLogFiles(files.sort((a: string, b: string) => b.localeCompare(a))); // Sort in descending order
      } else {
        console.error('Failed to fetch log files');
      }
    } catch (error) {
      console.error('Error fetching log files:', error);
    }
  };

  const formatFileName = (fileName: string) => {
    const match = fileName.match(/^message_log_(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2})/);
    if (match) {
      const [, date, time] = match;
      const [hours, minutes] = time.split('-');
      const dateObj = new Date(`${date}T${hours}:${minutes}:00Z`);
      
      const formattedDate = dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const formattedTime = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      return `${formattedDate} ${formattedTime}`;
    }
    return fileName;
  };

  const handleFileSelect = async (fileName: string) => {
    if (fileName) {
      try {
        const response = await fetch(`/api/read-log-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectDir, fileName }),
        });
        if (response.ok) {
          const data = await response.json();
          setLogContent(data.content);
          setShowLogContent(true);
        } else {
          console.error('Failed to fetch log content');
        }
      } catch (error) {
        console.error('Error fetching log content:', error);
      }
    }
    setSelectedFile(fileName);
  };

  const handlePopupClose = () => {
    setShowLogContent(false);
    setSelectedFile(''); // Reset select box to first option
  };

  return (
    <div className="bg-white dark:bg-darkBox p-4 rounded shadow mt-4">
      <h2 className="text-lg font-semibold mb-2 dark:text-darkText">History</h2>
      <div className="relative">
        <select
          value={selectedFile}
          onChange={(e) => handleFileSelect(e.target.value)}
          className="w-full px-3 py-2 text-gray-700 bg-white border rounded-lg shadow-sm outline-none appearance-none focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          <option value="">Select to view</option>
          {logFiles.map((file) => (
            <option key={file} value={file}>
              {formatFileName(file)}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="w-4 h-4 fill-current text-gray-500 dark:text-gray-300" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
          </svg>
        </div>
      </div>

      {showLogContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={popupRef} className="bg-white dark:bg-darkBox rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-darkText">Log Content: {formatFileName(selectedFile)}</h2>
              <button
                onClick={handlePopupClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-auto p-4 flex-grow">
              {logContent.map((entry, index) => (
                <div key={index} className={`mb-4 p-2 rounded ${entry.role === 'user' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <strong className="dark:text-darkText">{entry.role === 'user' ? 'User:' : `${entry.apiType || 'Assistant'}:`}</strong>
                  <pre className="whitespace-pre-wrap dark:text-gray-200">{entry.content}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;