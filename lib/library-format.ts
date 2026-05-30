import type {
  LibraryBook,
  LibraryNote,
  LibraryNotification,
  UserDevice,
} from '@/components/apps/library/types';

type GqlBook = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  coverUrl: string;
  borrowingStatus: string;
  borrower?: string | null;
  borrowDate?: string | null;
  returnDueDate?: string | null;
  pdfAttached: boolean;
  pdfStoragePath?: string | null;
  pdfName?: string | null;
  pdfContent?: string | null;
  pagesTotal: number;
  pagesRead: number;
  rating?: number | null;
  publishedDate?: string | null;
  authorInfo?: string | null;
};

export function mapGqlBook(row: GqlBook): LibraryBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    category: row.category,
    description: row.description,
    coverUrl: row.coverUrl,
    borrowingStatus: row.borrowingStatus === 'borrowed' ? 'borrowed' : 'available',
    borrower: row.borrower ?? undefined,
    borrowDate: row.borrowDate ?? undefined,
    returnDueDate: row.returnDueDate ?? undefined,
    pdfAttached: row.pdfAttached,
    pdfStoragePath: row.pdfStoragePath ?? undefined,
    pdfName: row.pdfName ?? undefined,
    pdfContent: row.pdfContent ?? undefined,
    pagesTotal: row.pagesTotal,
    pagesRead: row.pagesRead,
    rating: row.rating ?? undefined,
    publishedDate: row.publishedDate ?? undefined,
    authorInfo: row.authorInfo ?? undefined,
  };
}

export function mapGqlNote(row: {
  id: string;
  title: string;
  content: string;
  linkedBookIds: string[];
  lastSaved: string;
}): LibraryNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    linkedBookIds: row.linkedBookIds ?? [],
    lastSaved: row.lastSaved,
  };
}

export function mapGqlDevice(row: {
  id: string;
  name: string;
  type: string;
  lastSync: string;
  active: boolean;
}): UserDevice {
  return {
    id: row.id,
    name: row.name,
    type: row.type as UserDevice['type'],
    lastSync: row.lastSync,
    active: row.active,
  };
}

export function mapGqlNotification(row: {
  id: string;
  message: string;
  type: string;
  timestamp: string;
}): LibraryNotification {
  return {
    id: row.id,
    message: row.message,
    type: row.type as LibraryNotification['type'],
    timestamp: row.timestamp,
  };
}

export function newBookId(): string {
  return `book-${Date.now()}`;
}
