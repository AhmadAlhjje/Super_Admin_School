import { toast } from 'sonner';
import { errorMessage } from '../api/errors';

/** Runs a one-click action, reporting success/failure as toasts (never an unhandled rejection). */
export function runAction<T>(action: () => Promise<T>, successMessage?: string, onDone?: (result: T) => void): void {
  action()
    .then((result) => {
      if (successMessage) toast.success(successMessage);
      onDone?.(result);
    })
    .catch((error: unknown) => toast.error(errorMessage(error)));
}
