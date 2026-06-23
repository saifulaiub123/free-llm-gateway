/**
 * App-wide toast notification store (Svelte 5 runes).
 *
 * WHY a separate store: any component or module can import `toast` and push a notification without
 * direct coupling to the renderer. The {@link ToastContainer} component reads this store reactively.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastEntry {
  id: string;
  type: ToastType;
  message: string;
  /** Auto-dismiss timeout in ms. 0 = persistent. */
  timeout: number;
}

const DEFAULTS: Record<ToastType, number> = {
  success: 4000,
  error: 0, // persistent until dismissed
  warning: 6000,
  info: 4000,
};

let counter = 0;

class ToastStore {
  toasts = $state<ToastEntry[]>([]);

  private push(type: ToastType, message: string, timeout?: number): void {
    const id = `toast-${++counter}`;
    const entry: ToastEntry = { id, type, message, timeout: timeout ?? DEFAULTS[type] };
    this.toasts = [...this.toasts, entry];
    if (entry.timeout > 0) {
      setTimeout(() => this.dismiss(id), entry.timeout);
    }
  }

  success(message: string, timeout?: number): void {
    this.push('success', message, timeout);
  }

  error(message: string, timeout?: number): void {
    this.push('error', message, timeout);
  }

  warning(message: string, timeout?: number): void {
    this.push('warning', message, timeout);
  }

  info(message: string, timeout?: number): void {
    this.push('info', message, timeout);
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const toast = new ToastStore();
