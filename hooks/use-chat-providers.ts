'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';
import { isGatewayBenignError } from '@/lib/gateway-errors';
import { swallowClientError } from '@/lib/safe-client-storage';

const STORAGE_PROVIDER = 'durgasos.chat.provider';
const STORAGE_MODEL = 'durgasos.chat.model';

export type ChatProviderRow = {
  name: string;
  status: string;
  models: string[];
  capabilities?: string[];
  latency_tier?: string;
  display_name?: string;
};

export function useChatProviders() {
  const { callRpc } = useAiChatGateway();
  const [providers, setProviders] = useState<ChatProviderRow[]>([]);
  const [provider, setProviderState] = useState(() => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem(STORAGE_PROVIDER) || process.env.NEXT_PUBLIC_CHAT_PROVIDER?.trim() || ''
    );
  });
  const [model, setModelState] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_MODEL) || process.env.NEXT_PUBLIC_CHAT_MODEL?.trim() || '';
  });
  const [loading, setLoading] = useState(true);

  const setProvider = useCallback((name: string) => {
    setProviderState(name);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_PROVIDER, name);
  }, []);

  const setModel = useCallback((name: string) => {
    setModelState(name);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_MODEL, name);
  }, []);

  useEffect(() => {
    let active = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = (await callRpc('chat.providers', {})) as {
          providers?: ChatProviderRow[];
        };
        if (!active || !res?.providers) return;
        setProviders(res.providers);
        const saved = localStorage.getItem(STORAGE_PROVIDER);
        const pick =
          res.providers.find((p) => p.name === saved) ||
          res.providers.find((p) => p.status === 'available') ||
          res.providers[0];
        if (pick) {
          if (!saved) setProvider(pick.name);
          const models = pick.models ?? [];
          const savedModel = localStorage.getItem(STORAGE_MODEL);
          if (savedModel && models.includes(savedModel)) {
            setModel(savedModel);
          } else if (models[0]) {
            setModel(models[0]);
          }
        }
        setLoading(false);
      } catch (err) {
        if (!active || isGatewayBenignError(err)) return;
        if (attempt < 4) {
          attempt += 1;
          timer = setTimeout(load, 400 * attempt);
          return;
        }
        setLoading(false);
      }
    };

    timer = setTimeout(load, 150);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [callRpc, setModel, setProvider]);

  useEffect(() => {
    if (!provider) return;
    let active = true;
    void (async () => {
      try {
        const res = (await callRpc('chat.providers.models', {
          provider_name: provider,
        })) as { models?: string[]; default_model?: string };
        if (!active || !res?.models?.length) return;
        setProviders((prev) =>
          prev.map((p) => (p.name === provider ? { ...p, models: res.models ?? [] } : p))
        );
        if (res.default_model && res.models?.includes(res.default_model)) {
          setModel(res.default_model);
        } else if (res.models?.[0]) {
          setModel(res.models[0]);
        }
      } catch (err) {
        swallowClientError('chat-providers.models', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [provider, callRpc, setModel]);

  const modelsForProvider = providers.find((p) => p.name === provider)?.models ?? [];

  return {
    providers,
    provider,
    setProvider,
    model,
    setModel,
    modelsForProvider,
    loading,
  };
}
