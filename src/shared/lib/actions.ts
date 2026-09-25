import { toast } from 'sonner';
import { errorMessage } from '../api/errors';

/** "Deleted" with an undo button: deletions are archives, so they can be taken back. */
export function deletedWithUndo(
  message: string,
  undoLabel: string,
  undo: () => Promise<unknown>,
  onUndone: () => void,
): void {
  toast.success(message, {
    duration: 8000,
    action: { label: undoLabel, onClick: () => runAction(undo, undefined, onUndone) },
  });
}

/** Runs a one-click action, reporting success/failure as toasts (never an unhandled rejection). */
export function runAction<T>(action: () => Promise<T>, successMessage?: string, onDone?: (result: T) => void): void {
  action()
    .then((result) => {
      if (successMessage) toast.success(successMessage);
      onDone?.(result);
    })
    .catch((error: unknown) => toast.error(errorMessage(error)));
}
