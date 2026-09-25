import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '../api/errors';
import { cn } from '../lib/cn';
import { Button, IconButton } from './button';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const MODAL_SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/** Accessible modal dialog (focus trap, Escape, aria labelling via Radix). */
export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: ModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text/40 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-card)] bg-surface shadow-xl',
            MODAL_SIZES[size],
          )}
          // Without a description, opt out explicitly instead of repeating the title.
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-bold text-text">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm leading-7 text-secondary">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label={t('common.close')}>
                <X className="size-4" />
              </IconButton>
            </Dialog.Close>
          </div>
          {children !== undefined && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Side panel (navigation on small screens, details panels). */
export function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl"
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Async action; the dialog shows loading, closes on success and toasts the error on failure. */
  onConfirm: () => Promise<unknown>;
  successMessage?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  successMessage,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      if (successMessage) toast.success(successMessage);
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={title}
      description={body}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={() => void run()}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
