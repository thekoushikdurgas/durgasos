'use client';

import React, { useEffect } from 'react';
import { useStore } from './store';
import { useSudokuWebSocket } from './use-sudoku-websocket';
import { SudokuShell } from './SudokuShell';

export function SudokuApp() {
  const setConnected = useStore((state) => state.setConnected);
  const setCallRpc = useStore((state) => state.setCallRpc);
  const setRoom = useStore((state) => state.setRoom);
  const loadProfile = useStore((state) => state.loadProfile);

  const { callRpc } = useSudokuWebSocket(
    (room) => {
      setRoom(room);
    },
    (connected) => {
      setConnected(connected);
      if (connected) {
        // Hydrate profile statistics from FastAPI backend SQLite/Postgres DB
        void loadProfile();
      }
    }
  );

  useEffect(() => {
    setCallRpc(callRpc);
  }, [callRpc, setCallRpc]);

  return <SudokuShell />;
}
export default SudokuApp;
