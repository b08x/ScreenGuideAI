import React, { useState } from 'react';
import { Loader } from './Loader';
import { formatOutput } from '../utils/formatOutput';
import { ClipboardIcon, DownloadIcon, CheckIcon } from './icons';

interface OutputSectionProps {
  isLoading: boolean;
  output: string;
  error: string;
}

const Placeholder: React.FC = () => (
  <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <h3 className="text-lg font-medium text-gray-300">Your generated guide will appear here</h3>
    <p className="mt-1 text-sm">Upload a video and click "Generate" to start.</p>
  </div>
);

export const OutputSection: React.FC<OutputSectionProps> = ({ isLoading, output, error }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'screenguide-output.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700 h-[600px] lg:h-full flex flex-col shadow-lg">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-200">Generated Output</h2>
        {!isLoading && !error && output && (
          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-3 rounded-md transition-colors text-sm"
              aria-label="Copy to clipboard"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4 text-green-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <ClipboardIcon className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-3 rounded-md transition-colors text-sm"
              aria-label="Save as Markdown"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Save as .md</span>
            </button>
          </div>
        )}
      </div>
      <div className="bg-gray-900/70 rounded-lg p-4 flex-grow overflow-y-auto custom-scrollbar">
        {isLoading && <Loader />}
        {!isLoading && error && (
          <div className="text-red-400 bg-red-900/50 p-4 rounded-md h-full flex items-center justify-center">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && !output && <Placeholder />}
        {!isLoading && !error && output && (
          <div className="prose prose-invert prose-sm md:prose-base max-w-none">
            {formatOutput(output)}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple scrollbar styling for aesthetics
const styles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1f2937; /* gray-800 */
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4f46e5; /* indigo-600 */
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4338ca; /* indigo-700 */
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);