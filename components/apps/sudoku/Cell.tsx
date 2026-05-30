import React from 'react';
import { CellData } from './types';
import { cn } from '@/lib/utils';

interface CellProps {
  data: CellData;
  row: number;
  col: number;
  isSelected: boolean;
  onClick: () => void;
}

export const Cell: React.FC<CellProps> = ({ data, row, col, isSelected, onClick }) => {
  const { value, isInitial, notes, isError } = data;

  // Thick borders between 3x3 box boundaries, thin borders inside
  const borderRight =
    (col + 1) % 3 === 0 && col !== 8
      ? 'border-r-2 border-r-slate-400'
      : 'border-r border-r-slate-700';
  const borderBottom =
    (row + 1) % 3 === 0 && row !== 8
      ? 'border-b-2 border-b-slate-400'
      : 'border-b border-b-slate-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full h-full flex items-center justify-center cursor-pointer select-none transition-colors duration-75 relative outline-none',
        'text-xl sm:text-2xl font-mono',
        borderRight,
        borderBottom,
        isInitial
          ? 'bg-slate-700/60 text-slate-100 font-extrabold cursor-not-allowed'
          : 'bg-slate-800 text-slate-300',
        isSelected && (isInitial ? 'bg-slate-600' : 'bg-indigo-600 text-white'),
        isError && !isSelected && 'text-rose-400 bg-rose-500/10',
        isError && isSelected && 'bg-rose-900/50 text-rose-100'
      )}
      style={{ aspectRatio: '1/1' }}
    >
      {value !== 0 ? (
        value
      ) : (
        <div className="grid grid-cols-3 gap-0.5 w-full h-full p-0.5 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <div
              key={n}
              className="flex items-center justify-center text-[8px] sm:text-[10px] text-slate-500 font-bold leading-none"
            >
              {notes.includes(n) ? n : ''}
            </div>
          ))}
        </div>
      )}
    </button>
  );
};
export default Cell;
