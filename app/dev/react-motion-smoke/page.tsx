'use client';

import { useState } from 'react';
import { Motion, StaggeredMotion, TransitionMotion, spring } from 'react-motion';

import { SpringBox } from '@/components/motion/SpringBox';

export default function ReactMotionSmokePage() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([{ key: 'a' }, { key: 'b' }]);
  const [mouse, setMouse] = useState({ x: 200, y: 120 });

  return (
    <main className="min-h-screen space-y-10 bg-slate-950 p-8 text-white">
      <h1 className="text-xl font-semibold">react-motion smoke (React 19)</h1>

      <section className="space-y-2">
        <h2 className="text-sm text-slate-400">Motion + spring (demo0)</h2>
        <button
          type="button"
          className="rounded bg-cyan-600 px-3 py-1 text-sm"
          onClick={() => setOpen((o) => !o)}
        >
          Toggle
        </button>
        <SpringBox
          style={{ x: spring(open ? 200 : 0) }}
          className="h-12 w-12 rounded bg-violet-500"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm text-slate-400">TransitionMotion (demo3)</h2>
        <button
          type="button"
          className="rounded bg-cyan-600 px-3 py-1 text-sm"
          onClick={() =>
            setItems((prev) =>
              prev.length > 4 ? prev.slice(0, 2) : [...prev, { key: `k${Date.now()}` }]
            )
          }
        >
          Toggle list
        </button>
        <TransitionMotion
          styles={items.map((item) => ({
            key: item.key,
            style: { opacity: spring(1), height: spring(32) },
          }))}
          willEnter={() => ({ opacity: 0, height: 0 })}
          willLeave={() => ({ opacity: spring(0), height: spring(0) })}
        >
          {(configs) => (
            <ul className="space-y-1">
              {configs.map((c) => (
                <li
                  key={c.key}
                  className="rounded bg-white/10 px-3 text-sm"
                  style={{ opacity: c.style.opacity, height: c.style.height, overflow: 'hidden' }}
                >
                  {c.key}
                </li>
              ))}
            </ul>
          )}
        </TransitionMotion>
      </section>

      <section
        className="relative h-48 rounded border border-white/20"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
      >
        <h2 className="absolute left-2 top-2 text-sm text-slate-400">StaggeredMotion (demo1)</h2>
        <StaggeredMotion
          styles={(prev) =>
            [0, 1, 2, 3, 4, 5].map((i) => ({
              x: spring(i === 0 ? mouse.x : (prev?.[i - 1]?.x ?? mouse.x) - 20),
              y: spring(i === 0 ? mouse.y : (prev?.[i - 1]?.y ?? mouse.y) - 20),
            }))
          }
        >
          {(styles) => (
            <>
              {styles.map((s: { x: number; y: number }, i: number) => (
                <div
                  key={i}
                  className="absolute h-8 w-8 rounded-full bg-cyan-400/80"
                  style={{
                    transform: `translate3d(${s.x - 16}px, ${s.y - 16}px, 0)`,
                  }}
                />
              ))}
            </>
          )}
        </StaggeredMotion>
      </section>

      <section>
        <h2 className="text-sm text-slate-400">Raw Motion</h2>
        <Motion style={{ opacity: spring(1) }}>
          {(s) => <p style={{ opacity: s.opacity }}>OK</p>}
        </Motion>
      </section>
    </main>
  );
}
