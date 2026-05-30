import { BoardData, CellData, Difficulty } from './types';

// Deterministic Pseudo-Random Number Generator (Mulberry32)
export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helper to create empty board
const createEmptyBoard = (): number[][] => Array.from({ length: 9 }, () => Array(9).fill(0));

// Check if placing num at board[row][col] is valid
const isValid = (board: number[][], row: number, col: number, num: number): boolean => {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
    const boxRow = 3 * Math.floor(row / 3) + Math.floor(x / 3);
    const boxCol = 3 * Math.floor(col / 3) + (x % 3);
    if (board[boxRow][boxCol] === num) return false;
  }
  return true;
};

// Solve board using backtracking
const solve = (board: number[][], randomFn: () => number = Math.random): boolean => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => randomFn() - 0.5);
        for (const num of nums) {
          if (isValid(board, r, c, num)) {
            board[r][c] = num;
            if (solve(board, randomFn)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

// Count solutions to ensure uniqueness
const countSolutions = (board: number[][], limit: number = 2): number => {
  let count = 0;

  const solveAndCount = (grid: number[][]) => {
    if (count >= limit) return;

    let row = -1;
    let col = -1;
    let isEmpty = false;

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (grid[i][j] === 0) {
          row = i;
          col = j;
          isEmpty = true;
          break;
        }
      }
      if (isEmpty) break;
    }

    if (!isEmpty) {
      count++;
      return;
    }

    for (let num = 1; num <= 9; num++) {
      if (isValid(grid, row, col, num)) {
        grid[row][col] = num;
        solveAndCount(grid);
        grid[row][col] = 0;
      }
    }
  };

  const gridCopy = board.map((row) => [...row]);
  solveAndCount(gridCopy);
  return count;
};

// Get all valid candidate numbers for a cell
const getCandidates = (board: number[][], row: number, col: number): number[] => {
  const list: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, row, col, num)) {
      list.push(num);
    }
  }
  return list;
};

// Analyze a Sudoku grid to determine its logic-based difficulty, score, and required techniques
export const analyzeSudokuDifficulty = (
  grid: number[][]
): { difficulty: Difficulty; score: number; techniques: string[] } => {
  const board = grid.map((row) => [...row]);
  let score = 0;
  const techniques = new Set<string>();

  let changed = true;
  let unfilled = board.flat().filter((x) => x === 0).length;

  while (changed && unfilled > 0) {
    changed = false;

    // 1. Naked Singles
    let nakedSingleFound = false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const candidates = getCandidates(board, r, c);
          if (candidates.length === 1) {
            board[r][c] = candidates[0];
            score += 1;
            techniques.add('Naked Singles');
            unfilled--;
            nakedSingleFound = true;
            changed = true;
            break;
          }
        }
      }
      if (changed) break;
    }
    if (nakedSingleFound) continue;

    // 2. Hidden Singles (Row, Column, Box)
    let hiddenSingleFound = false;

    // Rows
    for (let r = 0; r < 9; r++) {
      const candidatePositions: Record<number, number[]> = {};
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const candidates = getCandidates(board, r, c);
          for (const cand of candidates) {
            if (!candidatePositions[cand]) candidatePositions[cand] = [];
            candidatePositions[cand].push(c);
          }
        }
      }
      for (let cand = 1; cand <= 9; cand++) {
        if (candidatePositions[cand] && candidatePositions[cand].length === 1) {
          const col = candidatePositions[cand][0];
          board[r][col] = cand;
          score += 2;
          techniques.add('Hidden Singles');
          unfilled--;
          hiddenSingleFound = true;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (hiddenSingleFound) continue;

    // Columns
    for (let c = 0; c < 9; c++) {
      const candidatePositions: Record<number, number[]> = {};
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === 0) {
          const candidates = getCandidates(board, r, c);
          for (const cand of candidates) {
            if (!candidatePositions[cand]) candidatePositions[cand] = [];
            candidatePositions[cand].push(r);
          }
        }
      }
      for (let cand = 1; cand <= 9; cand++) {
        if (candidatePositions[cand] && candidatePositions[cand].length === 1) {
          const row = candidatePositions[cand][0];
          board[row][c] = cand;
          score += 2;
          techniques.add('Hidden Singles');
          unfilled--;
          hiddenSingleFound = true;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (hiddenSingleFound) continue;

    // Boxes (3x3 blocks)
    for (let b = 0; b < 9; b++) {
      const startRow = Math.floor(b / 3) * 3;
      const startCol = (b % 3) * 3;
      const candidatePositions: Record<number, { r: number; c: number }[]> = {};

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = startRow + i;
          const c = startCol + j;
          if (board[r][c] === 0) {
            const candidates = getCandidates(board, r, c);
            for (const cand of candidates) {
              if (!candidatePositions[cand]) candidatePositions[cand] = [];
              candidatePositions[cand].push({ r, c });
            }
          }
        }
      }
      for (let cand = 1; cand <= 9; cand++) {
        if (candidatePositions[cand] && candidatePositions[cand].length === 1) {
          const { r, c } = candidatePositions[cand][0];
          board[r][c] = cand;
          score += 2;
          techniques.add('Hidden Singles');
          unfilled--;
          hiddenSingleFound = true;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (hiddenSingleFound) continue;

    // 3. Pointing Pairs / Box-Line Reduction
    let pointingReductionFound = false;
    for (let b = 0; b < 9; b++) {
      const startRow = Math.floor(b / 3) * 3;
      const startCol = (b % 3) * 3;

      for (let cand = 1; cand <= 9; cand++) {
        const matchingCells: { r: number; c: number }[] = [];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const r = startRow + i;
            const c = startCol + j;
            if (board[r][c] === 0 && isValid(board, r, c, cand)) {
              matchingCells.push({ r, c });
            }
          }
        }

        if (matchingCells.length >= 2 && matchingCells.length <= 3) {
          const r0 = matchingCells[0].r;
          const isSameRow = matchingCells.every((cell) => cell.r === r0);
          if (isSameRow) {
            let eliminatedSome = false;
            for (let col = 0; col < 9; col++) {
              if (board[r0][col] === 0 && Math.floor(col / 3) !== b % 3) {
                if (isValid(board, r0, col, cand)) {
                  eliminatedSome = true;
                }
              }
            }
            if (eliminatedSome) {
              score += 6;
              techniques.add('Pointing Pairs');
              pointingReductionFound = true;
              changed = true;
              const firstEmpty = matchingCells[0];
              board[firstEmpty.r][firstEmpty.c] = cand;
              unfilled--;
              break;
            }
          }

          const c0 = matchingCells[0].c;
          const isSameCol = matchingCells.every((cell) => cell.c === c0);
          if (isSameCol) {
            let eliminatedSome = false;
            for (let row = 0; row < 9; row++) {
              if (board[row][c0] === 0 && Math.floor(row / 3) !== Math.floor(b / 3)) {
                if (isValid(board, row, c0, cand)) {
                  eliminatedSome = true;
                }
              }
            }
            if (eliminatedSome) {
              score += 6;
              techniques.add('Pointing Pairs');
              pointingReductionFound = true;
              changed = true;
              const firstEmpty = matchingCells[0];
              board[firstEmpty.r][firstEmpty.c] = cand;
              unfilled--;
              break;
            }
          }
        }
      }
      if (changed) break;
    }
    if (pointingReductionFound) continue;

    // 4. Naked Pairs
    let nakedPairFound = false;
    for (let r = 0; r < 9; r++) {
      const cellsWithTwoCandidates: { c: number; cand: number[] }[] = [];
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const candidates = getCandidates(board, r, c);
          if (candidates.length === 2) {
            cellsWithTwoCandidates.push({ c, cand: candidates });
          }
        }
      }
      for (let i = 0; i < cellsWithTwoCandidates.length; i++) {
        for (let j = i + 1; j < cellsWithTwoCandidates.length; j++) {
          const cellA = cellsWithTwoCandidates[i];
          const cellB = cellsWithTwoCandidates[j];
          if (cellA.cand[0] === cellB.cand[0] && cellA.cand[1] === cellB.cand[1]) {
            let canPrune = false;
            for (let c = 0; c < 9; c++) {
              if (board[r][c] === 0 && c !== cellA.c && c !== cellB.c) {
                const candidates = getCandidates(board, r, c);
                if (candidates.includes(cellA.cand[0]) || candidates.includes(cellA.cand[1])) {
                  canPrune = true;
                }
              }
            }
            if (canPrune) {
              score += 8;
              techniques.add('Naked Pairs');
              nakedPairFound = true;
              changed = true;
              board[r][cellA.c] = cellA.cand[0];
              unfilled--;
              break;
            }
          }
        }
        if (changed) break;
      }
      if (changed) break;
    }
    if (nakedPairFound) continue;
  }

  if (unfilled > 0) {
    score += 25 + unfilled * 2;
    techniques.add('Backtracking Search');
  }

  const clueCount = 81 - grid.flat().filter((x) => x === 0).length;
  let difficulty: Difficulty = 'Easy';

  if (score > 100 || techniques.has('Backtracking Search') || clueCount < 25) {
    difficulty = 'Expert';
  } else if (
    score > 55 ||
    techniques.has('Pointing Pairs') ||
    techniques.has('Naked Pairs') ||
    clueCount < 30
  ) {
    difficulty = 'Hard';
  } else if (score > 25 || clueCount < 36) {
    difficulty = 'Medium';
  } else if (score > 12 && clueCount < 50) {
    difficulty = 'Easy';
  } else {
    difficulty = 'Very Easy';
  }

  return {
    difficulty,
    score,
    techniques: Array.from(techniques),
  };
};

export const generateFullBoard = (randomFn: () => number = Math.random): number[][] => {
  const board = createEmptyBoard();
  solve(board, randomFn);
  return board;
};

export const generatePuzzle = (
  difficulty: Difficulty,
  seed?: number
): { board: BoardData; solution: number[][] } => {
  const randomFn = seed !== undefined ? mulberry32(seed) : Math.random;
  let solution: number[][] = [];
  let puzzleGrid: number[][] = [];
  let bestPuzzleGrid: number[][] = [];
  let bestDiffMatches = false;

  const targetCellsToRemove = {
    'Very Easy': 26,
    Easy: 36,
    Medium: 46,
    Hard: 52,
    Expert: 58,
  }[difficulty];

  for (let attempt = 0; attempt < 10; attempt++) {
    solution = generateFullBoard(randomFn);
    puzzleGrid = solution.map((row) => [...row]);

    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push([r, c]);
      }
    }
    cells.sort(() => randomFn() - 0.5);

    let removedCount = 0;
    for (const [r, c] of cells) {
      if (removedCount >= targetCellsToRemove) break;

      const backup = puzzleGrid[r][c];
      puzzleGrid[r][c] = 0;

      if (countSolutions(puzzleGrid) !== 1) {
        puzzleGrid[r][c] = backup;
      } else {
        removedCount++;
      }
    }

    const analysis = analyzeSudokuDifficulty(puzzleGrid);
    if (analysis.difficulty === difficulty) {
      bestPuzzleGrid = puzzleGrid;
      bestDiffMatches = true;
      break;
    } else {
      if (
        bestPuzzleGrid.length === 0 ||
        (difficulty === 'Expert' && analysis.difficulty === 'Hard') ||
        (difficulty === 'Hard' && analysis.difficulty === 'Medium') ||
        (difficulty === 'Medium' && analysis.difficulty === 'Easy') ||
        (difficulty === 'Easy' && analysis.difficulty === 'Very Easy')
      ) {
        bestPuzzleGrid = puzzleGrid.map((row) => [...row]);
      }
    }
  }

  const finalPuzzleGrid = bestDiffMatches
    ? bestPuzzleGrid
    : bestPuzzleGrid.length > 0
      ? bestPuzzleGrid
      : puzzleGrid;

  const boardData: BoardData = finalPuzzleGrid.map((row, r) =>
    row.map((val, c) => ({
      value: val,
      isInitial: val !== 0,
      notes: [],
      isError: false,
      isHint: false,
    }))
  );

  return { board: boardData, solution };
};

export const validateGrid = (grid: number[][]): boolean => {
  for (let r = 0; r < 9; r++) {
    const seen = new Set();
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val < 1 || val > 9 || seen.has(val)) return false;
      seen.add(val);
    }
  }
  for (let c = 0; c < 9; c++) {
    const seen = new Set();
    for (let r = 0; r < 9; r++) {
      const val = grid[r][c];
      if (seen.has(val)) return false;
      seen.add(val);
    }
  }
  for (let b = 0; b < 9; b++) {
    const seen = new Set();
    const startRow = Math.floor(b / 3) * 3;
    const startCol = (b % 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const val = grid[startRow + r][startCol + c];
        if (seen.has(val)) return false;
        seen.add(val);
      }
    }
  }
  return true;
};

export const checkBoard = (current: BoardData, solution: number[][]): BoardData => {
  return current.map((row, r) =>
    row.map((cell, c) => ({
      ...cell,
      isError: cell.value !== 0 && cell.value !== solution[r][c],
    }))
  );
};

export const isGameComplete = (current: BoardData, solution: number[][]): boolean => {
  return current.every((row, r) => row.every((cell, c) => cell.value === solution[r][c]));
};
