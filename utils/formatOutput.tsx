
import React from 'react';

// This is a simple markdown parser. For a real app, a library like 'react-markdown' would be more robust.
export const formatOutput = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listType: 'ol' | 'ul' | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(<ol key={`list-${elements.length}`} className="list-decimal pl-5 space-y-1 mb-4">{listItems}</ol>);
      } else {
        elements.push(<ul key={`list-${elements.length}`} className="list-disc pl-5 space-y-1 mb-4">{listItems}</ul>);
      }
      listItems = [];
      listType = null;
    }
  };
  
  const formatLine = (line: string) => {
    // Bold **text**
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    return <span dangerouslySetInnerHTML={{ __html: line }} />;
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith('###')) {
      flushList();
      elements.push(<h3 key={index} className="text-xl font-semibold mt-6 mb-2">{formatLine(line.replace('###', '').trim())}</h3>);
    } else if (line.trim().startsWith('##')) {
      flushList();
      elements.push(<h2 key={index} className="text-2xl font-bold mt-8 mb-3 pb-1 border-b border-gray-600">{formatLine(line.replace('##', '').trim())}</h2>);
    } else if (line.trim().startsWith('#')) {
      flushList();
      elements.push(<h1 key={index} className="text-3xl font-extrabold mt-4 mb-4">{formatLine(line.replace('#', '').trim())}</h1>);
    } else if (line.trim().match(/^\d+\./)) { // Ordered list
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={index}>{formatLine(line.replace(/^\d+\./, '').trim())}</li>);
    } else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) { // Unordered list
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={index}>{formatLine(line.substring(2))}</li>);
    } else if (line.trim() === '') {
      flushList();
      // We can add a vertical space for empty lines if needed, but for now, we'll just break lists.
    } else {
      flushList();
      elements.push(<p key={index} className="mb-4 leading-relaxed">{formatLine(line)}</p>);
    }
  });

  flushList(); // Add any remaining list items

  return <>{elements}</>;
};
