const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Tisna Rizqiana/Music/NongolDulu/frontend/src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  // Fix form containers and specific bg-whites
  content = content.replace(/bg-white border-slate-200/g, 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700');
  content = content.replace(/bg-white rounded-2xl/g, 'bg-white dark:bg-slate-800/80 rounded-2xl');
  content = content.replace(/bg-white shadow-xl/g, 'bg-white dark:bg-slate-800/80 shadow-xl');
  
  // Fix inputs and selects
  content = content.replace(/bg-white font-medium/g, 'bg-white dark:bg-slate-800 font-medium');
  content = content.replace(/border-slate-200 rounded/g, 'border-slate-200 dark:border-slate-700 rounded');
  content = content.replace(/bg-slate-50\/50/g, 'bg-slate-50/50 dark:bg-slate-900/50');
  content = content.replace(/bg-slate-50 rounded-t/g, 'bg-slate-50 dark:bg-slate-900/50 rounded-t');
  content = content.replace(/bg-slate-50 flex/g, 'bg-slate-50 dark:bg-slate-900/50 flex');
  content = content.replace(/bg-slate-50 border/g, 'bg-slate-50 dark:bg-slate-900/50 border');
  
  // Text colors inside inputs/text
  content = content.replace(/text-slate-700/g, 'text-slate-700 dark:text-slate-200');
  
  // FaceEnrollment specific
  content = content.replace(/bg-white rounded-\[2rem\]/g, 'bg-white dark:bg-slate-800/80 rounded-[2rem]');
  content = content.replace(/bg-slate-50 rounded-xl/g, 'bg-slate-50 dark:bg-slate-900/50 rounded-xl');
  content = content.replace(/bg-slate-100/g, 'bg-slate-100 dark:bg-slate-700/50');

  // Input background for inputs with border
  content = content.replace(/px-4 py-2 border/g, 'px-4 py-2 border dark:bg-slate-800 dark:text-slate-200');
  content = content.replace(/px-4 py-3 border/g, 'px-4 py-3 border dark:bg-slate-800 dark:text-slate-200');
  
  // ManageUsers.jsx search input
  content = content.replace(/pl-12 pr-4 py-3 rounded-xl border/g, 'pl-12 pr-4 py-3 rounded-xl border dark:bg-slate-800 dark:text-slate-200');

  // Any raw text-slate-800/500 missed
  content = content.replace(/text-slate-800(?! dark:)/g, 'text-slate-800 dark:text-slate-100');
  content = content.replace(/text-slate-500(?! dark:)/g, 'text-slate-500 dark:text-slate-400');
  
  // Clean duplicates like text-slate-800 dark:text-slate-100 dark:text-slate-100 if any
  content = content.replace(/dark:text-slate-100 dark:text-slate-100/g, 'dark:text-slate-100');
  content = content.replace(/dark:text-slate-400 dark:text-slate-400/g, 'dark:text-slate-400');
  
  // Additional safety for border colors
  content = content.replace(/dark:border-slate-700 dark:border-slate-700/g, 'dark:border-slate-700');
  
  fs.writeFileSync(p, content);
});
console.log('Fixed CSS classes via script.');
