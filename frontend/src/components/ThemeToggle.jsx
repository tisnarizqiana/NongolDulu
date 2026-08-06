import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 focus:outline-none"
      aria-label="Toggle Dark Mode"
      title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 transition-transform duration-300 hover:rotate-90 hover:text-amber-500" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300 hover:-rotate-12 hover:text-indigo-600" />
      )}
    </button>
  );
};

export default ThemeToggle;
