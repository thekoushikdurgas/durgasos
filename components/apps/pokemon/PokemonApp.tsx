'use client';

import React, { useEffect } from 'react';
import { useStore } from './store';
import { usePokemonWebSocket } from './use-pokemon-websocket';
import { PokemonShell } from './PokemonShell';

export function PokemonApp() {
  const setConnected = useStore((state) => state.setConnected);
  const setCallRpc = useStore((state) => state.setCallRpc);
  const loadProfile = useStore((state) => state.loadProfile);
  const loadLeaderboard = useStore((state) => state.loadLeaderboard);

  const { callRpc } = usePokemonWebSocket((connected) => {
    setConnected(connected);
    if (connected) {
      // Hydrate data from backend
      void loadProfile();
      void loadLeaderboard();
    }
  });

  useEffect(() => {
    setCallRpc(callRpc);
  }, [callRpc, setCallRpc]);

  return <PokemonShell />;
}

export default PokemonApp;
