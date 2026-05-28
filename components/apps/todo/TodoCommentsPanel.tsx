'use client';

import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { TODO_COMMENTS, CREATE_TODO_COMMENT, DELETE_TODO_COMMENT } from '@/lib/graphql-modules';
import { cn } from '@/lib/utils';
import type { TodoCard } from '@/lib/todo-format';

type CommentItem = {
  id: string;
  taskId: string;
  ownerId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type TodoCommentsPanelProps = {
  card: TodoCard | null;
  onClose: () => void;
};

export function TodoCommentsPanel({ card, onClose }: TodoCommentsPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const taskId = card?.id ?? '';

  const { data, loading, refetch } = useQuery(TODO_COMMENTS, {
    skip: !taskId,
    variables: { taskId },
    fetchPolicy: 'cache-and-network',
  });

  const [createComment] = useMutation(CREATE_TODO_COMMENT);
  const [deleteComment] = useMutation(DELETE_TODO_COMMENT);

  const comments = useMemo<CommentItem[]>(() => data?.todoComments ?? [], [data?.todoComments]);

  // Scroll to bottom on load / new comment
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !taskId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment({
        variables: { taskId, content: text },
      });
      setCommentText('');
      await refetch();
    } catch (err) {
      console.error('Failed to create comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment permanently?')) return;
    try {
      await deleteComment({
        variables: { commentId },
      });
      await refetch();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="flex h-full w-80 sm:w-96 flex-col border-l border-white/10 bg-slate-900/85 backdrop-blur-lg shadow-2xl z-20 shrink-0"
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="size-4 text-violet-400 shrink-0" />
              <h3 className="font-semibold text-sm text-white truncate" title={card.title}>
                {card.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Comment Thread List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {loading && comments.length === 0 ? (
              <div className="flex h-full items-center justify-center text-white/40 text-xs">
                <Loader2 className="size-4 animate-spin text-violet-400 mr-2" />
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-white/30 text-xs space-y-2">
                <MessageSquare className="size-8 text-white/10 stroke-[1.5]" />
                <p>No comments yet.</p>
                <p className="text-[10px] text-white/20">Be the first to leave a thought!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="group flex gap-2.5 text-xs">
                  {/* Avatar */}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/30 text-[10px] font-semibold text-violet-300 uppercase shrink-0 border border-violet-500/20">
                    U
                  </span>
                  {/* Content Container */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-white/90">You</span>
                      <span className="text-[9px] text-white/35">
                        {new Date(comment.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] border border-white/[0.05] p-2.5 text-white/80 leading-relaxed break-words whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                  {/* Actions on hover */}
                  <button
                    onClick={() => void handleDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded self-start shrink-0"
                    title="Delete Comment"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Comment Composer */}
          <div className="border-t border-white/10 p-3 bg-slate-900/40">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <div className="relative flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a comment..."
                  rows={1}
                  className="w-full max-h-24 min-h-[38px] rounded-lg bg-slate-950 px-3 py-2 text-xs text-white border border-white/10 placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none leading-normal"
                />
              </div>
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmitting}
                className={cn(
                  'flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-violet-600 text-white transition-all duration-150',
                  commentText.trim() && !isSubmitting
                    ? 'hover:bg-violet-500 active:scale-95'
                    : 'opacity-40 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
