'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  StepForward,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';
import { useMutation } from '@apollo/client/react';
import { useWindowLaunch } from '@/components/window-launch-context';
import { useGoogleDriveLaunchSource } from '@/hooks/use-google-drive-launch-source';
import { cn } from '@/lib/utils';
import { swallowClientError } from '@/lib/safe-client-storage';
import { STORAGE_GET_URL } from '@/lib/graphql-modules';

type StorageUrlPayload = { success?: boolean; url?: string };

const DEMO_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerApp() {
  const launch = useWindowLaunch();
  const driveSrc = useGoogleDriveLaunchSource(launch);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fetchGen = useRef(0);
  const [userPickedSrc, setUserPickedSrc] = useState<string | null>(null);
  const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);
  const src = driveSrc.objectUrl ?? userPickedSrc ?? fetchedSrc ?? DEMO_VIDEO;
  const [paused, setPaused] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<'Paused' | 'Playing' | 'Ended'>('Paused');
  const [getUrl] = useMutation(STORAGE_GET_URL);

  useEffect(() => {
    if (driveSrc.objectUrl) {
      return;
    }
    const s = launch?.storage;
    const name = launch?.fileName ?? '';
    if (
      !s?.file_path &&
      !launch?.googleDrive &&
      !name.match(
        /\.(mp4|webm|mp3|wav|ogg|m4a|mov|flac|aac|m4v|mkv|avi|wmv|flv|mpe?g|opus|wma|3gp|amr)$/i
      )
    )
      return;
    fetchGen.current += 1;
    const gen = fetchGen.current;
    let cancelled = false;
    void (async () => {
      if (s?.file_path) {
        try {
          const { data } = await getUrl({
            variables: { params: { bucket_type: s.bucket_type, file_path: s.file_path } },
          });
          const json = data?.storageGetUrl as StorageUrlPayload | undefined;
          const url = json?.success && json.url ? json.url : null;
          if (url && !cancelled && gen === fetchGen.current) setFetchedSrc(url);
        } catch (err) {
          swallowClientError('player-app.fetchUrl', err);
        }
        return;
      }
      if (!cancelled && gen === fetchGen.current) setFetchedSrc(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [launch?.fileName, launch?.storage, launch?.googleDrive, driveSrc.objectUrl, getUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = vol;
  }, [vol]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setStatus('Playing');
    } else {
      v.pause();
      setStatus('Paused');
    }
    setPaused(v.paused);
  }, []);

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    setDuration(v.duration || 0);
    setPaused(v.paused);
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setCurrent(t);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950/95 text-slate-100">
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-white/10 px-2 text-[10px] uppercase text-white/50">
        <span>Media</span>
        <span>Playback</span>
        <span>Audio</span>
        <span>Video</span>
        <span>Help</span>
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          src={src}
          onTimeUpdate={onTime}
          onLoadedMetadata={onTime}
          onPlay={() => {
            setStatus('Playing');
            setPaused(false);
          }}
          onPause={() => {
            setStatus('Paused');
            setPaused(true);
          }}
          onEnded={() => setStatus('Ended')}
          muted={muted}
        />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-slate-900/90 px-3 py-2">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={current}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="mt-1 flex justify-between text-[10px] text-white/50">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/5 px-3 py-2">
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 hover:bg-white/10"
          onClick={togglePlay}
        >
          {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5 opacity-60"
          onClick={() => {
            const v = videoRef.current;
            if (v) {
              v.pause();
              v.currentTime = 0;
            }
            setStatus('Paused');
          }}
        >
          <Square className="h-4 w-4" />
        </button>
        <button type="button" className="rounded border border-white/10 p-1.5 opacity-60">
          <SkipBack className="h-4 w-4" />
        </button>
        <button type="button" className="rounded border border-white/10 p-1.5 opacity-60">
          <SkipForward className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded border border-white/10 p-1.5"
          onClick={() => {
            const v = videoRef.current;
            if (v) v.currentTime = Math.min(v.duration, v.currentTime + 1 / 30);
          }}
        >
          <StepForward className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="ml-2 rounded border border-white/10 p-1.5"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            try {
              void v.requestFullscreen();
            } catch (err) {
              swallowClientError('player-app.requestFullscreen', err);
            }
          }}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded p-1"
            onClick={() => setMuted((m) => !m)}
            aria-label="Mute"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vol}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVol(v);
              if (videoRef.current) videoRef.current.volume = v;
            }}
            className="w-24 accent-emerald-500"
          />
          <span className="w-10 text-right text-[10px] text-white/50">
            {Math.round(vol * 100)}%
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUserPickedSrc(URL.createObjectURL(f));
          }}
        />
        <button
          type="button"
          className="rounded border border-white/10 px-2 py-1 text-[10px] hover:bg-white/10"
          onClick={() => fileInputRef.current?.click()}
        >
          Open file
        </button>
      </div>

      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-white/10 bg-black/40 px-3 text-[10px] text-white/50">
        <span>{status}</span>
        <span>
          {fmt(current)} / {fmt(duration)}
        </span>
      </footer>
    </div>
  );
}
