'use client';

import { useEffect, useRef } from 'react';

const openDialogs: HTMLElement[] = [];
let previousOverflow = '';

/** Keep keyboard navigation in the topmost dialog and restore its opener. */
export function useDialogFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!openDialogs.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs.push(dialog);
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
    dialog.tabIndex = -1;
    const frame = requestAnimationFrame(() => {
      if (openDialogs.at(-1) === dialog && !dialog.contains(document.activeElement)) {
        (controls()[0] || dialog).focus();
      }
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || openDialogs.at(-1) !== dialog) return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      const wasTop = openDialogs.at(-1) === dialog;
      openDialogs.splice(openDialogs.indexOf(dialog), 1);
      if (!openDialogs.length) document.body.style.overflow = previousOverflow;
      if (wasTop && opener?.isConnected) opener.focus();
    };
  }, [open]);
  return ref;
}
