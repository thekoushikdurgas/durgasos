'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X as XIcon } from 'lucide-react';
import styles from './dialog.module.css';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={`${styles.overlay} ${className || ''}`}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={`${styles.content} ${className || ''}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" className={`${styles.body} ${className || ''}`} {...props} />;
}

function DialogHeader({
  className,
  children,
  hideCloseButton = false,
  ...props
}: React.ComponentProps<'div'> & { hideCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-header" className={`${styles.header} ${className || ''}`} {...props}>
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className={styles.closeButton}>
          <XIcon className={styles.closeIcon} />
          <span className={styles.srOnly}>Close</span>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-footer" className={`${styles.footer} ${className || ''}`} {...props} />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={`${styles.title} ${className || ''}`}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={`${styles.description} ${className || ''}`}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
