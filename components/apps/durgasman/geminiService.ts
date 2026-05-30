import { buildBackendAuthHeaders } from '@/lib/backend-http';
import { getBackendOrigin } from '@/lib/backend-url';

import { ChatMessage, ApiRequest, Collection, ApiResponse, KeyValue } from './types';

function durgasmanUrl(path: string): string {
  return `${getBackendOrigin()}/api/durgasman${path}`;
}

async function durgasmanPost<T>(path: string, body: unknown): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const auth = buildBackendAuthHeaders();
  for (const [k, v] of Object.entries(auth)) {
    headers.set(k, v);
  }
  const response = await fetch(durgasmanUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function chatWithGemini(
  prompt: string,
  history: ChatMessage[],
  options: { thinking?: boolean; search?: boolean } = {}
): Promise<{ text: string; groundingUrls?: string[] }> {
  return durgasmanPost('/chat', { prompt, history, options });
}

export async function analyzeApiResponse(
  response: ApiResponse,
  request: ApiRequest
): Promise<string> {
  const result = await durgasmanPost<{ text?: string }>('/analyze', { response, request });
  return result.text || 'Failed to analyze response.';
}

export async function generateCollectionDocs(collection: Collection): Promise<string> {
  const result = await durgasmanPost<{ text?: string }>('/generate-docs', { collection });
  return result.text || 'Failed to generate documentation.';
}

export async function generateRequestFromPrompt(
  prompt: string,
  schemaHint?: string
): Promise<Partial<ApiRequest> | null> {
  try {
    const result = await durgasmanPost<{ request: Partial<ApiRequest> }>('/generate-request', {
      prompt,
      schemaHint,
    });
    const data = result.request;
    return {
      ...data,
      id: crypto.randomUUID(),
      params: (data.params || []).map((p: Partial<KeyValue>) => ({
        id: crypto.randomUUID(),
        key: p.key ?? '',
        value: p.value ?? '',
        enabled: p.enabled ?? true,
      })),
      headers: (data.headers || []).map((h: Partial<KeyValue>) => ({
        id: crypto.randomUUID(),
        key: h.key ?? '',
        value: h.value ?? '',
        enabled: h.enabled ?? true,
      })),
    };
  } catch {
    return null;
  }
}

export async function generateImage(
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<string | null> {
  try {
    const result = await durgasmanPost<{ image?: string }>('/generate-image', {
      prompt,
      aspectRatio,
    });
    return result.image || null;
  } catch {
    return null;
  }
}

export async function speak(text: string): Promise<void> {
  const result = await durgasmanPost<{ audio?: string }>('/speak', { text });
  const base64Audio = result.audio;
  if (!base64Audio) return;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 24000,
  });
  const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
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

export function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

export function getDurgasmanWebSocketUrl(): string {
  const u = new URL(getBackendOrigin());
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = '/api/durgasman/live-ws';
  return u.toString();
}

export const connectLive = (callbacks: any) => {
  const wsUrl = getDurgasmanWebSocketUrl();
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    const setupMessage = {
      setup: {
        model: 'models/gemini-2.5-flash',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Zephyr',
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: 'You are Durgasman AI Live Assistant. Help users debug their API requests in real-time.',
            },
          ],
        },
      },
    };
    ws.send(JSON.stringify(setupMessage));
    if (callbacks.onopen) callbacks.onopen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (callbacks.onmessage) callbacks.onmessage(data);
    } catch (e) {
      console.error('Failed to parse websocket message', e);
    }
  };

  ws.onclose = () => {
    if (callbacks.onclose) callbacks.onclose();
  };

  ws.onerror = (e) => {
    if (callbacks.onerror) callbacks.onerror(e);
  };

  return Promise.resolve({
    sendRealtimeInput: (input: { media: { data: string; mimeType: string } }) => {
      if (ws.readyState === WebSocket.OPEN) {
        const mediaMessage = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: input.media.mimeType,
                data: input.media.data,
              },
            ],
          },
        };
        ws.send(JSON.stringify(mediaMessage));
      }
    },
    close: () => {
      ws.close();
    },
  });
};
