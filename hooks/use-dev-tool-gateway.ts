'use client';

import { useCallback } from 'react';

import { useAiChatGateway } from '@/hooks/use-ai-chat-gateway';

export type FetchPageResult = {
  html: string;
  assets: {
    images: string[];
    videos: string[];
    scripts: string[];
    styles: string[];
  };
  pageInfo: {
    title: string;
    description: string;
    internalLinks: number;
    externalLinks: number;
    internalLinkUrls: string[];
  };
};

export function useDevToolGateway() {
  const { callRpc } = useAiChatGateway();

  const fetchPage = useCallback(
    async (url: string): Promise<FetchPageResult> => {
      const result = await callRpc('dev_tool.fetch_page', { url });
      return result as FetchPageResult;
    },
    [callRpc]
  );

  return { fetchPage };
}
