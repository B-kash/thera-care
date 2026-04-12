"use client";

import { formFieldClassName } from "@/lib/form-classes";
import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  type MutableRefObject,
  type Ref,
} from "react";

/** Shared look for calendar fields (matches app forms). */
export const dateFieldClassName = formFieldClassName;

function openPickerIfSupported(el: HTMLInputElement | null) {
  if (!el) return;
  const anyEl = el as HTMLInputElement & { showPicker?: () => void };
  if (typeof anyEl.showPicker === "function") {
    try {
      anyEl.showPicker();
      return;
    } catch {
      /* ignore — e.g. not a user gesture in some browsers */
    }
  }
  el.click();
}

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

type OmitType = Omit<React.ComponentPropsWithoutRef<"input">, "type">;

export type DateInputProps = OmitType & {
  /** Visually hidden; control is still labelled for pickers. */
  label: string;
};

function assignRef<T>(el: T | null, ref: Ref<T> | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(el);
  else (ref as MutableRefObject<T | null>).current = el;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput({ label, id, className, disabled, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const innerRef = useRef<HTMLInputElement>(null);

    const setRefs = useCallback(
      (el: HTMLInputElement | null) => {
        innerRef.current = el;
        assignRef(el, ref);
      },
      [ref],
    );

    const open = useCallback(() => {
      if (!disabled) openPickerIfSupported(innerRef.current);
    }, [disabled]);

    return (
      <div className="relative mt-1">
        <input
          ref={setRefs}
          id={inputId}
          type="date"
          disabled={disabled}
          aria-label={label}
          className={`${dateFieldClassName} pr-10 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
          {...rest}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={open}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-foreground/50 hover:bg-app-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          aria-label={`Open calendar: ${label}`}
        >
          <CalendarGlyph className="h-4 w-4" />
        </button>
      </div>
    );
  },
);

export type DateTimeInputProps = OmitType & { label: string };

export const DateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(
  function DateTimeInput({ label, id, className, disabled, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const innerRef = useRef<HTMLInputElement>(null);

    const setRefs = useCallback(
      (el: HTMLInputElement | null) => {
        innerRef.current = el;
        assignRef(el, ref);
      },
      [ref],
    );

    const open = useCallback(() => {
      if (!disabled) openPickerIfSupported(innerRef.current);
    }, [disabled]);

    return (
      <div className="relative mt-1">
        <input
          ref={setRefs}
          id={inputId}
          type="datetime-local"
          disabled={disabled}
          aria-label={label}
          className={`${dateFieldClassName} pr-10 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
          {...rest}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={open}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-foreground/50 hover:bg-app-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          aria-label={`Open date and time picker: ${label}`}
        >
          <CalendarGlyph className="h-4 w-4" />
        </button>
      </div>
    );
  },
);
