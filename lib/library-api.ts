import { buildBackendAuthHeaders } from '@/lib/backend-http';
import { getBackendOrigin } from '@/lib/backend-url';
import type { ChatMessage, LibraryBook, StatisticsReport } from '@/components/apps/library/types';

export type BookLookupResult = {
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  category?: string;
  pagesTotal?: number;
  publishedDate?: string;
  isbn?: string;
  authorInfo?: string;
  source?: string;
};

export async function lookupBookByIsbn(
  isbn: string,
  title?: string,
  author?: string
): Promise<BookLookupResult> {
  const params = new URLSearchParams();
  if (isbn) params.set('isbn', isbn);
  if (title) params.set('title', title);
  if (author) params.set('author', author);
  const res = await fetch(`${getBackendOrigin()}/api/library/books/lookup?${params}`, {
    headers: buildBackendAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Lookup failed');
  }
  return res.json();
}

export async function libraryChat(
  query: string,
  activeBookIds: string[],
  chatHistory: ChatMessage[]
): Promise<ChatMessage> {
  const res = await fetch(`${getBackendOrigin()}/api/library/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildBackendAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({
      query,
      activeBookIds,
      chatHistory: chatHistory.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
      })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Chat request failed');
  }
  return res.json();
}

export async function fetchLibraryStatistics(): Promise<StatisticsReport> {
  const res = await fetch(`${getBackendOrigin()}/api/library/statistics`, {
    headers: buildBackendAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load statistics');
  return res.json();
}

export function bookToUpsertInput(book: Partial<LibraryBook> & { id: string }) {
  return {
    id: book.id,
    title: book.title || 'Untitled Book',
    author: book.author || 'Unknown Author',
    isbn: book.isbn || '',
    category: book.category || 'General',
    description: book.description || '',
    coverUrl: book.coverUrl || '',
    borrowingStatus: book.borrowingStatus || 'available',
    borrower: book.borrower ?? null,
    borrowDate: book.borrowDate ?? null,
    returnDueDate: book.returnDueDate ?? null,
    pdfAttached: book.pdfAttached ?? false,
    pdfStoragePath: book.pdfStoragePath ?? null,
    pdfName: book.pdfName ?? null,
    pdfContent: book.pdfContent ?? null,
    pagesTotal: book.pagesTotal ?? 200,
    pagesRead: book.pagesRead ?? 0,
    rating: book.rating ?? null,
    publishedDate: book.publishedDate ?? null,
    authorInfo: book.authorInfo ?? null,
  };
}
