'use client';

import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import styles from './toast.module.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastProps extends Toast {
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const typeClasses: Record<ToastType, string> = {
  success: styles.toastSuccess,
  error: styles.toastError,
  info: styles.toastInfo,
  warning: styles.toastWarning,
};

export function ToastItem({ id, title, description, type, onDismiss }: ToastProps) {
  const Icon = iconMap[type];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const classes = [styles.toastItem, typeClasses[type]].join(' ');

  return (
    <div className={classes}>
      <Icon className={styles.toastIcon} />
      <div className={styles.toastContent}>
        <h3 className={styles.toastTitle}>{title}</h3>
        {description && <p className={styles.toastDescription}>{description}</p>}
      </div>
      <button onClick={() => onDismiss(id)} className={styles.toastDismissButton}>
        <X className={styles.toastDismissIcon} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
