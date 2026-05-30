'use client';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
  Cog,
  Database,
  FileSpreadsheet,
  Layers,
  Upload,
} from 'lucide-react';
import React, { useState } from 'react';
import styles from './CsvImportTracker.module.css';

export type ImportStage =
  | 'idle'
  | 'parsing'
  | 'analyzing'
  | 'mapping'
  | 'uploading'
  | 'encoding'
  | 'finalizing'
  | 'completed'
  | 'failed';

export interface ImportSubtask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface ImportTask {
  id: string;
  fileName: string;
  stage: ImportStage;
  progress: number;
  subtasks: ImportSubtask[];
  error?: string;
}

interface CsvImportTrackerProps {
  tasks: ImportTask[];
  onTaskClick?: (taskId: string) => void;
  expandedTaskId?: string | null;
}

const STAGE_CONFIG: Record<ImportStage, { label: string; icon: React.ReactNode; color: string }> = {
  idle: {
    label: 'Waiting',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-gray-400',
  },
  parsing: {
    label: 'Parsing CSV',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  analyzing: {
    label: 'Analyzing Columns',
    icon: <Cog className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  mapping: {
    label: 'Mapping Data Types',
    icon: <Database className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  uploading: {
    label: 'Uploading',
    icon: <Upload className="h-4 w-4" />,
    color: 'text-blue-500',
  },
  encoding: {
    label: 'Encoding to Pixels',
    icon: <Layers className="h-4 w-4" />,
    color: 'text-purple-500',
  },
  finalizing: {
    label: 'Finalizing',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-500',
  },
  completed: {
    label: 'Completed',
    icon: <Check className="h-4 w-4" />,
    color: 'text-green-500',
  },
  failed: {
    label: 'Failed',
    icon: <CircleX className="h-4 w-4" />,
    color: 'text-red-500',
  },
};

const STAGE_ORDER: ImportStage[] = [
  'idle',
  'parsing',
  'analyzing',
  'mapping',
  'uploading',
  'encoding',
  'finalizing',
  'completed',
];

export function CsvImportTracker({ tasks, onTaskClick, expandedTaskId }: CsvImportTrackerProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const taskVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -5,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: prefersReducedMotion ? ('tween' as const) : ('spring' as const),
        stiffness: 500,
        damping: 30,
        duration: prefersReducedMotion ? 0.2 : undefined,
      },
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -5,
      transition: { duration: 0.15 },
    },
  };

  const subtaskListVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      overflow: 'hidden',
    },
    visible: {
      height: 'auto',
      opacity: 1,
      overflow: 'visible',
      transition: {
        duration: 0.25,
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        when: 'beforeChildren' as const,
        ease: [0.2, 0.65, 0.3, 0.9] as const,
      },
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: 'hidden',
      transition: {
        duration: 0.2,
        ease: [0.2, 0.65, 0.3, 0.9] as const,
      },
    },
  };

  const subtaskVariants = {
    hidden: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : -10,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: prefersReducedMotion ? ('tween' as const) : ('spring' as const),
        stiffness: 500,
        damping: 25,
        duration: prefersReducedMotion ? 0.2 : undefined,
      },
    },
    exit: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : -10,
      transition: { duration: 0.15 },
    },
  };

  const getStageProgress = (stage: ImportStage): number => {
    const index = STAGE_ORDER.indexOf(stage);
    return index >= 0 ? (index / (STAGE_ORDER.length - 1)) * 100 : 0;
  };

  const getStatusIcon = (status: ImportSubtask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'in-progress':
        return <CircleDotDashed className="h-3.5 w-3.5 text-blue-500" />;
      case 'failed':
        return <CircleX className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Circle className="text-muted-foreground h-3.5 w-3.5" />;
    }
  };

  return (
    <div className={styles.container}>
      <LayoutGroup>
        <div className={styles.taskList}>
          <AnimatePresence mode="popLayout">
            {tasks.map((task, index) => {
              const isExpanded = expandedTaskId === task.id;
              const stageConfig = STAGE_CONFIG[task.stage];
              const isCompleted = task.stage === 'completed';
              const isFailed = task.stage === 'failed';

              return (
                <motion.div
                  key={task.id}
                  className={`${styles.taskItem} ${index !== 0 ? styles.taskItemBorder : ''}`}
                  variants={taskVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  {/* Task Row */}
                  <motion.div
                    className={styles.taskRow}
                    onClick={() => onTaskClick?.(task.id)}
                    whileHover={{
                      backgroundColor: 'rgba(0,0,0,0.03)',
                      transition: { duration: 0.2 },
                    }}
                  >
                    {/* Status Icon */}
                    <motion.div
                      className={styles.statusIcon}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={task.stage}
                          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                          transition={{
                            duration: 0.2,
                            ease: [0.2, 0.65, 0.3, 0.9],
                          }}
                          className={stageConfig.color}
                        >
                          {stageConfig.icon}
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>

                    {/* Task Content */}
                    <div className={styles.taskContent}>
                      <span
                        className={`${styles.taskName} ${isCompleted ? styles.taskNameCompleted : ''}`}
                      >
                        {task.fileName}
                      </span>

                      {/* Progress Bar */}
                      <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarTrack}>
                          <motion.div
                            className={`${styles.progressBarFill} ${
                              isFailed ? styles.progressBarFillError : ''
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress}%` }}
                            transition={{
                              duration: prefersReducedMotion ? 0 : 0.5,
                              ease: [0.2, 0.65, 0.3, 0.9],
                            }}
                          />
                        </div>
                        <span className={styles.progressText}>{task.progress.toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Stage Badge */}
                    <motion.span
                      className={`${styles.stageBadge} ${
                        task.stage === 'completed'
                          ? styles.stageBadgeCompleted
                          : task.stage === 'failed'
                            ? styles.stageBadgeFailed
                            : task.stage === 'idle'
                              ? styles.stageBadgePending
                              : styles.stageBadgeActive
                      }`}
                    >
                      {stageConfig.label}
                    </motion.span>
                  </motion.div>

                  {/* Error Message */}
                  {task.error && (
                    <motion.div
                      className={styles.errorMessage}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <CircleAlert className="h-4 w-4" />
                      <span>{task.error}</span>
                    </motion.div>
                  )}

                  {/* Expanded Subtasks */}
                  <AnimatePresence>
                    {isExpanded && task.subtasks.length > 0 && (
                      <motion.div
                        className={styles.subtaskList}
                        variants={subtaskListVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                      >
                        <div className={styles.subtaskConnector} />
                        <ul className={styles.subtaskItems}>
                          {task.subtasks.map((subtask) => (
                            <motion.li
                              key={subtask.id}
                              className={styles.subtaskItem}
                              variants={subtaskVariants}
                            >
                              <motion.div
                                className={styles.subtaskIcon}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: prefersReducedMotion ? 'tween' : 'spring',
                                  stiffness: 500,
                                  damping: 25,
                                }}
                              >
                                {getStatusIcon(subtask.status)}
                              </motion.div>
                              <span
                                className={`${styles.subtaskTitle} ${
                                  subtask.status === 'completed' ? styles.subtaskTitleCompleted : ''
                                }`}
                              >
                                {subtask.title}
                              </span>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </div>
  );
}

// Hook to create and manage import tasks
export function useCsvImportTracker() {
  const [tasks, setTasks] = useState<ImportTask[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const addTask = (fileName: string): string => {
    const id = `${fileName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: ImportTask = {
      id,
      fileName,
      stage: 'idle',
      progress: 0,
      subtasks: [
        { id: 'parse', title: 'Parse CSV structure', status: 'pending' },
        { id: 'analyze', title: 'Analyze column types', status: 'pending' },
        { id: 'upload', title: 'Upload to server', status: 'pending' },
        { id: 'encode', title: 'Encode to video pixels', status: 'pending' },
        { id: 'finalize', title: 'Finalize import', status: 'pending' },
      ],
    };
    setTasks((prev) => [...prev, newTask]);
    return id;
  };

  const updateTask = (taskId: string, updates: Partial<ImportTask>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  };

  const updateSubtask = (taskId: string, subtaskId: string, status: ImportSubtask['status']) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          subtasks: task.subtasks.map((st) => (st.id === subtaskId ? { ...st, status } : st)),
        };
      })
    );
  };

  const setTaskStage = (taskId: string, stage: ImportStage) => {
    const progress = stage === 'completed' ? 100 : getStageProgress(stage);
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              stage,
              progress,
            }
          : task
      )
    );
  };

  const setTaskProgress = (taskId: string, progress: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, progress: Math.min(100, Math.max(0, progress)) } : task
      )
    );
  };

  const setTaskError = (taskId: string, error: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              stage: 'failed',
              error,
            }
          : task
      )
    );
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    }
  };

  const clearTasks = () => {
    setTasks([]);
    setExpandedTaskId(null);
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const getStageProgress = (stage: ImportStage): number => {
    const STAGE_ORDER: ImportStage[] = [
      'idle',
      'parsing',
      'analyzing',
      'mapping',
      'uploading',
      'encoding',
      'finalizing',
      'completed',
    ];
    const index = STAGE_ORDER.indexOf(stage);
    return index >= 0 ? (index / (STAGE_ORDER.length - 1)) * 100 : 0;
  };

  const isComplete = tasks.every((t) => t.stage === 'completed' || t.stage === 'failed');
  const hasErrors = tasks.some((t) => t.stage === 'failed');
  const completedCount = tasks.filter((t) => t.stage === 'completed').length;

  return {
    tasks,
    expandedTaskId,
    addTask,
    updateTask,
    updateSubtask,
    setTaskStage,
    setTaskProgress,
    setTaskError,
    removeTask,
    clearTasks,
    toggleExpanded,
    isComplete,
    hasErrors,
    completedCount,
    totalCount: tasks.length,
  };
}

export default CsvImportTracker;
