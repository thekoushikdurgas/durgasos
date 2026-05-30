import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Key } from 'lucide-react';
import { useStore } from './store';
import { cn } from '@/lib/utils';

// Helper for PCM blob
interface GeminiBlob {
  data: string;
  mimeType: string;
}

function createBlob(data: Float32Array): GeminiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const LiveCoach: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const { game } = useStore();

  // Refs for audio handling
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('durgasos_sudoku_gemini_api_key') || '';
      setApiKey(stored);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasos_sudoku_gemini_api_key', key);
    }
  };

  const stopSession = () => {
    if (inputContextRef.current) {
      try {
        inputContextRef.current.close();
      } catch {}
    }
    if (outputContextRef.current) {
      try {
        outputContextRef.current.close();
      } catch {}
    }

    setIsActive(false);
    setStatus('disconnected');
  };

  const startSession = async () => {
    const keyToUse = apiKey.trim() || (process.env as any).NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!keyToUse) {
      setShowKeyInput(true);
      return;
    }

    setIsActive(true);
    setStatus('connecting');

    try {
      // Dynamic import to support SSR environments
      const { GoogleGenAI, Modality } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: keyToUse });

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      inputContextRef.current = inputAudioContext;
      outputContextRef.current = outputAudioContext;
      nextStartTimeRef.current = outputAudioContext.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            // Setup input stream
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: any) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContext.state !== 'closed') {
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContext.currentTime
              );
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContext,
                24000,
                1
              );
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }

            // Handle tool calls
            const toolCall = message.toolCall;
            if (toolCall) {
              const functionCalls = toolCall.functionCalls;
              const functionResponses = functionCalls.map((call: any) => {
                if (call.name === 'get_board_state') {
                  const currentBoard = useStore.getState().game.board;
                  // Simple board formatter
                  const boardStr = currentBoard
                    .map((row) => row.map((c) => (c.value === 0 ? '.' : c.value)).join(' '))
                    .join('\n');
                  return {
                    id: call.id,
                    name: call.name,
                    response: { result: { board: boardStr } },
                  };
                }
                return { id: call.id, name: call.name, response: { error: 'Unknown tool' } };
              });

              sessionPromise.then((session) => session.sendToolResponse({ functionResponses }));
            }
          },
          onclose: () => {
            setStatus('disconnected');
            setIsActive(false);
          },
          onerror: (e) => {
            console.error(e);
            setStatus('disconnected');
            setIsActive(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'get_board_state',
                  description:
                    'Get the current Sudoku board state. Use this to understand the puzzle structure and give specific advice.',
                },
              ],
            },
          ],
          systemInstruction: `
            You are an enthusiastic Sudoku coach named "Kore".
            The user is playing a game right now. 
            You have access to the current board state via the 'get_board_state' tool.
            ALWAYS call this tool when the user asks for help or advice about the specific puzzle.
            Offer short, encouraging comments. 
            If they ask for help, explain sudoku strategies simply using the board data. 
            Do not give coordinates unless asked explicitly.
            Be fun and lively!
          `,
        },
      });

      sessionRef.current = sessionPromise;
    } catch (err) {
      console.error('Failed to start live session', err);
      setStatus('disconnected');
      setIsActive(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={isActive ? stopSession : startSession}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all w-full select-none shadow-md',
            isActive
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
              : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'
          )}
        >
          {status === 'connecting' ? (
            <span className="animate-pulse">Connecting...</span>
          ) : isActive ? (
            <>
              <MicOff size={14} />
              <span>Stop Coach</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </>
          ) : (
            <>
              <Mic size={14} />
              <span>AI Voice Coach</span>
            </>
          )}
        </button>

        <button
          type="button"
          aria-label="Toggle API Key Input"
          onClick={() => setShowKeyInput(!showKeyInput)}
          className={cn(
            'p-2 rounded-lg border transition-colors',
            showKeyInput
              ? 'bg-slate-700 text-indigo-400 border-slate-600'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
          )}
        >
          <Key size={14} />
        </button>
      </div>

      {showKeyInput && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 shadow-inner">
          <label className="text-[10px] text-slate-500 font-bold uppercase">Gemini API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            placeholder="Paste Gemini API key..."
            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
          />
          <p className="text-[9px] text-slate-600 leading-tight">
            Required for Multimodal Live Audio connections. Keys are saved locally.
          </p>
        </div>
      )}
    </div>
  );
};
export default LiveCoach;
