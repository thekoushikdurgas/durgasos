import React, { useEffect } from 'react';
import { useStore } from './store';
import { Cell } from './Cell';

export const SudokuBoard: React.FC = () => {
  const { game, selectCell, setCellValue, toggleNote } = useStore();
  const { board, selectedCell } = game;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (game.status !== 'playing') return;

      if (selectedCell) {
        const [r, c] = selectedCell;
        if (e.key === 'ArrowUp') selectCell(Math.max(0, r - 1), c);
        if (e.key === 'ArrowDown') selectCell(Math.min(8, r + 1), c);
        if (e.key === 'ArrowLeft') selectCell(r, Math.max(0, c - 1));
        if (e.key === 'ArrowRight') selectCell(r, Math.min(8, c + 1));

        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
          if (e.shiftKey) {
            toggleNote(parseInt(e.key));
          } else {
            void setCellValue(parseInt(e.key));
          }
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          void setCellValue(0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.status, selectedCell, selectCell, setCellValue, toggleNote]);

  return (
    <div className="aspect-square w-full max-w-lg mx-auto border-4 border-slate-600 rounded-lg overflow-hidden bg-slate-800 shadow-2xl">
      <div className="grid grid-cols-9 grid-rows-9 w-full h-full">
        {board &&
          board.map((row, r) =>
            row.map((cellData, c) => (
              <Cell
                key={`${r}-${c}`}
                row={r}
                col={c}
                data={cellData}
                isSelected={selectedCell?.[0] === r && selectedCell?.[1] === c}
                onClick={() => selectCell(r, c)}
              />
            ))
          )}
      </div>
    </div>
  );
};
export default SudokuBoard;
