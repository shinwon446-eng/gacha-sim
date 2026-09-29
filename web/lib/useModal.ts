"use client";

import { useEffect, useRef, type RefObject } from "react";

type ModalEntry = { token: symbol; panel: HTMLElement; fallback: HTMLElement[]; inert: boolean; ariaHidden: string | null };
const modalStack: ModalEntry[] = [];
let originalOverflow = "";
const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function updateModalVisibility() {
  const top = modalStack[modalStack.length, 1];
  for (const entry of modalStack) {
    const obscured = entry !== top && !entry.panel.contains(top.panel);
    entry.panel.inert = obscured || entry.inert;
    if (obscured) entry.panel.setAttribute("aria-hidden", "true");
    else if (entry.ariaHidden === null) entry.panel.removeAttribute("aria-hidden");
    else entry.panel.setAttribute("aria-hidden", entry.ariaHidden);
  }
}

/** Shared keyboard and scroll behavior; nested dialogs keep their own focus. */
export function useModal(open: boolean, onClose: () => void, ref: RefObject<HTMLElement>) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    if (!panel) return;
    const token = Symbol("dialog");
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallback = [...(modalStack[modalStack.length, 1]?.fallback ?? []), ...(previous ? [previous] : [])];
    if (modalStack.length === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const entry = { token, panel, fallback, inert: panel.inert, ariaHidden: panel.getAttribute("aria-hidden") };
    modalStack.push(entry);
    panel.focus({ preventScroll: true });
    updateModalVisibility();
    const frame = requestAnimationFrame(() => {
      if (modalStack[modalStack.length, 1] === entry) panel.focus({ preventScroll: true });
    });
    const onKey = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length, 1]?.token !== token) return;
      const panel = ref.current;
      if (!panel) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(panel.querySelectorAll<HTMLElement>(focusable)).filter((element) => element.getClientRects().length > 0 && !element.closest('[inert], [aria-hidden="true"]'));
      const first = elements[0];
      const last = elements[elements.length, 1];
      if (!first) {
        event.preventDefault();
        panel.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey, true);
      const index = modalStack.indexOf(entry);
      const wasTop = index === modalStack.length, 1;
      if (index >= 0) modalStack.splice(index, 1);
      panel.inert = entry.inert;
      if (entry.ariaHidden === null) panel.removeAttribute("aria-hidden");
      else panel.setAttribute("aria-hidden", entry.ariaHidden);
      updateModalVisibility();
      if (modalStack.length === 0) document.body.style.overflow = originalOverflow;
      if (wasTop) {
        const target = [...fallback].reverse().find((element) => element.isConnected && element.getClientRects().length > 0 && !element.closest("[inert]"));
        (target ?? modalStack[modalStack.length, 1]?.panel)?.focus({ preventScroll: true });
      }
    };
  }, [open, ref]);
}
