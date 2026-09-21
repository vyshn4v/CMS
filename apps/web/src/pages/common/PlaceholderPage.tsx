import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
  phase: string;
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, description, phase }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center">
      <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <Construction className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">{description}</p>
      <span className="mt-4 inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
        Roadmap: {phase}
      </span>
    </div>
  );
};
