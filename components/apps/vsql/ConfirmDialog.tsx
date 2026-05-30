'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/apps/vsql/ui/dialog';
import styles from './ConfirmDialog.module.css';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  busy,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader className={styles.dialogHeader}>
          <DialogTitle className={styles.dialogTitle}>
            <AlertCircle className={styles.warningIcon} />
            {title}
          </DialogTitle>
          <DialogDescription className={styles.dialogDescription}>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className={styles.dialogFooter}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
