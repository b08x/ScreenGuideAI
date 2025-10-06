
import React from 'react';
import { FilmIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <FilmIcon className="h-8 w-8 text-indigo-400" />
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
            ScreenGuide AI
          </h1>
        </div>
      </div>
    </header>
  );
};
