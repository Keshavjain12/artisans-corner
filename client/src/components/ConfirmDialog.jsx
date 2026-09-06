import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui.jsx';

/**
 * Accessible confirmation modal: focus moves in on open, Escape closes, and
 * focus is trapped between the two actions while it is showing.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    confirmRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel?.();
        return;
      }
      if (event.key !== 'Tab') return;

      // Keep Tab inside the dialog: a modal that lets focus wander onto the
      // page behind it is unusable with a keyboard or a screen reader.
      const focusable = panelRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Hand focus back to whatever opened the dialog.
      if (typeof previouslyFocused?.focus === 'function') previouslyFocused.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-md animate-fade-up rounded-2xl bg-white p-6 shadow-lift"
      >
        <div className="flex gap-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              destructive ? 'bg-red-50 text-red-600' : 'bg-clay-50 text-clay-600'
            }`}
          >
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            <p id="confirm-description" className="mt-1.5 text-sm text-ink-muted">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} type="button">
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            type="button"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
