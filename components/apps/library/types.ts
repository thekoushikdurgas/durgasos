export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  coverUrl: string;
  borrowingStatus: 'available' | 'borrowed';
  borrower?: string;
  borrowDate?: string;
  returnDueDate?: string;
  pdfAttached: boolean;
  pdfStoragePath?: string;
  pdfName?: string;
  pdfContent?: string;
  pagesTotal: number;
  pagesRead: number;
  rating?: number;
  publishedDate?: string;
  authorInfo?: string;
}

export interface LibraryNote {
  id: string;
  title: string;
  content: string;
  linkedBookIds: string[];
  lastSaved: string;
}

export interface Citation {
  id: string;
  bookId: string;
  bookTitle: string;
  quote?: string;
  page?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemma';
  text: string;
  citations?: Citation[];
  timestamp: string;
}

export interface UserDevice {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  lastSync: string;
  active: boolean;
}

export interface LibraryNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: string;
}

export interface StatisticsReport {
  totalBooks: number;
  borrowedBooks: number;
  completedBooks: number;
  totalPagesRead: number;
  readingEfficiency: number;
  averageRating?: number;
  categoryDistribution: { name: string; value: number }[];
}
