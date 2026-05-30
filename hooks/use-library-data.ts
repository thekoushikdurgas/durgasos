'use client';

import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo } from 'react';

import type { LibraryBook, LibraryNote } from '@/components/apps/library/types';
import { bookToUpsertInput } from '@/lib/library-api';
import { mapGqlBook, mapGqlDevice, mapGqlNote, mapGqlNotification } from '@/lib/library-format';
import {
  LIBRARY_BOOK_DELETE,
  LIBRARY_BOOK_UPSERT,
  LIBRARY_BOOKS,
  LIBRARY_DEVICES,
  LIBRARY_NOTE_DELETE,
  LIBRARY_NOTE_UPSERT,
  LIBRARY_NOTES,
  LIBRARY_NOTIFICATION_DELETE,
  LIBRARY_NOTIFICATIONS,
  LIBRARY_TRIGGER_SYNC,
} from '@/lib/graphql-modules';

export function useLibraryData(enabled: boolean) {
  const booksQ = useQuery(LIBRARY_BOOKS, { skip: !enabled, fetchPolicy: 'cache-and-network' });
  const notesQ = useQuery(LIBRARY_NOTES, { skip: !enabled, fetchPolicy: 'cache-and-network' });
  const devicesQ = useQuery(LIBRARY_DEVICES, { skip: !enabled, fetchPolicy: 'cache-and-network' });
  const notifsQ = useQuery(LIBRARY_NOTIFICATIONS, {
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
  });

  const [upsertBook] = useMutation(LIBRARY_BOOK_UPSERT);
  const [deleteBook] = useMutation(LIBRARY_BOOK_DELETE);
  const [upsertNote] = useMutation(LIBRARY_NOTE_UPSERT);
  const [deleteNote] = useMutation(LIBRARY_NOTE_DELETE);
  const [triggerSync] = useMutation(LIBRARY_TRIGGER_SYNC);
  const [deleteNotification] = useMutation(LIBRARY_NOTIFICATION_DELETE);

  const books = useMemo(
    () => (booksQ.data?.libraryBooks ?? []).map(mapGqlBook),
    [booksQ.data?.libraryBooks]
  );
  const notes = useMemo(
    () => (notesQ.data?.libraryNotes ?? []).map(mapGqlNote),
    [notesQ.data?.libraryNotes]
  );
  const devices = useMemo(
    () => (devicesQ.data?.libraryDevices ?? []).map(mapGqlDevice),
    [devicesQ.data?.libraryDevices]
  );
  const notifications = useMemo(
    () => (notifsQ.data?.libraryNotifications ?? []).map(mapGqlNotification),
    [notifsQ.data?.libraryNotifications]
  );

  const refetchAll = useCallback(async () => {
    await Promise.all([booksQ.refetch(), notesQ.refetch(), devicesQ.refetch(), notifsQ.refetch()]);
  }, [booksQ, notesQ, devicesQ, notifsQ]);

  const saveBook = useCallback(
    async (book: Partial<LibraryBook> & { id: string }) => {
      await upsertBook({
        variables: { input: bookToUpsertInput(book) },
      });
      await booksQ.refetch();
      await notifsQ.refetch();
    },
    [upsertBook, booksQ, notifsQ]
  );

  const removeBook = useCallback(
    async (bookId: string) => {
      await deleteBook({ variables: { bookId } });
      await booksQ.refetch();
    },
    [deleteBook, booksQ]
  );

  const saveNote = useCallback(
    async (note: LibraryNote) => {
      await upsertNote({
        variables: {
          input: {
            id: note.id,
            title: note.title,
            content: note.content,
            linkedBookIds: note.linkedBookIds,
          },
        },
      });
      await notesQ.refetch();
    },
    [upsertNote, notesQ]
  );

  const removeNote = useCallback(
    async (noteId: string) => {
      await deleteNote({ variables: { noteId } });
      await notesQ.refetch();
    },
    [deleteNote, notesQ]
  );

  const runSync = useCallback(async () => {
    await triggerSync();
    await devicesQ.refetch();
    await notifsQ.refetch();
  }, [triggerSync, devicesQ, notifsQ]);

  const clearNotification = useCallback(
    async (notificationId: string) => {
      await deleteNotification({ variables: { notificationId } });
      await notifsQ.refetch();
    },
    [deleteNotification, notifsQ]
  );

  const loading = booksQ.loading || notesQ.loading || devicesQ.loading || notifsQ.loading;

  return {
    books,
    notes,
    devices,
    notifications,
    loading,
    error: booksQ.error ?? notesQ.error,
    refetchAll,
    saveBook,
    removeBook,
    saveNote,
    removeNote,
    runSync,
    clearNotification,
  };
}
