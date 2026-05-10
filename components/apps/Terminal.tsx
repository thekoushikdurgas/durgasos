'use client';

import { Terminal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function TerminalApp() {
  const [history, setHistory] = useState([
    { type: 'sys', content: 'Durgasos Bash v2.0.1' },
    { type: 'sys', content: 'Type "help" for a list of available commands.' },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      const cmd = input.trim();
      setHistory((prev) => [...prev, { type: 'cmd', content: `$ ${cmd}` }]);

      // Simple mock parser
      let response = '';
      if (cmd === 'help') response = 'Available commands: help, echo, date, whoami, clear';
      else if (cmd.startsWith('echo ')) response = cmd.substring(5);
      else if (cmd === 'date') response = new Date().toString();
      else if (cmd === 'whoami') response = 'root_administrator';
      else if (cmd === 'clear') {
        setHistory([]);
        setInput('');
        return;
      } else response = `bash: command not found: ${cmd}`;

      setHistory((prev) => [...prev, { type: 'res', content: response }]);
      setInput('');
    }
  };

  return (
    <div className="absolute inset-0 bg-[#1e1e1e] text-green-400 font-mono text-sm p-4 overflow-y-auto flex flex-col">
      {history.map((line, i) => (
        <div
          key={i}
          className={`mb-1 ${line.type === 'sys' ? 'text-gray-400' : line.type === 'cmd' ? 'text-blue-400' : 'text-green-400'}`}
        >
          {line.content}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-blue-400">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder:text-green-900 focus:ring-0"
          autoFocus
          spellCheck={false}
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}
