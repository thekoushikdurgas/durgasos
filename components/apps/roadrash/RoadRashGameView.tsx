'use client';

import { useRoadRash } from '@/contexts/roadrash-context';
import { RoadRashHudOverlay } from '@/components/apps/roadrash/hud/RoadRashHudOverlay';

export function RoadRashGameView() {
  const { canvasRef } = useRoadRash();

  return (
    <div className="rr-game-viewport">
      <canvas
        ref={canvasRef}
        width={1024}
        height={576}
        layoutsubtree=""
        aria-label="Road Rash race track"
      >
        <div id="rr-hud-container" className="absolute inset-0 pointer-events-none w-full h-full">
          <RoadRashHudOverlay />
        </div>
        {/* HTML-in-Canvas Billboard Templates */}
        <div id="rr-billboard-templates" className="hidden" aria-hidden="true">
          <div
            id="ad-tata"
            style={{
              width: '200px',
              height: '100px',
              background: 'linear-gradient(to right, #1d4ed8, #1e3a8a)',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontFamily: 'system-ui, sans-serif',
              padding: '10px',
              boxSizing: 'border-box',
              border: '3px solid #60a5fa',
              borderRadius: '4px',
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>
              TATA MOTORS
            </span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>Connecting Aspirations</span>
          </div>
          <div
            id="ad-amul"
            style={{
              width: '200px',
              height: '100px',
              background: '#fef3c7',
              color: '#dc2626',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontFamily: 'serif',
              padding: '10px',
              boxSizing: 'border-box',
              border: '3px solid #ea580c',
              borderRadius: '4px',
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: 'black', fontStyle: 'italic' }}>Amul</span>
            <span style={{ fontSize: '9px', color: '#1e3a8a', fontWeight: 'bold' }}>
              The Taste of India
            </span>
          </div>
          <div
            id="ad-royal"
            style={{
              width: '200px',
              height: '100px',
              background: '#1c1917',
              color: '#f59e0b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontFamily: 'monospace',
              padding: '10px',
              boxSizing: 'border-box',
              border: '3px solid #d97706',
              borderRadius: '4px',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>ROYAL ENFIELD</span>
            <span style={{ fontSize: '9px', color: '#a8a29e' }}>Since 1901</span>
          </div>
          <div
            id="ad-bisleri"
            style={{
              width: '200px',
              height: '100px',
              background: '#0d9488',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontFamily: 'sans-serif',
              padding: '10px',
              boxSizing: 'border-box',
              border: '3px solid #2dd4bf',
              borderRadius: '4px',
            }}
          >
            <span style={{ fontSize: '22px', fontWeight: 'bold', fontStyle: 'italic' }}>
              Bisleri
            </span>
            <span style={{ fontSize: '9px', color: '#ccfbf1' }}>With Added Minerals</span>
          </div>
        </div>
      </canvas>
      <div className="rr-game-vignette" aria-hidden />
    </div>
  );
}
