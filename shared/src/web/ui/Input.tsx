import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { UtilityIcons } from '../icons/utility';
import { ICON_SIZES } from '../icons/types';

/** Shared control chrome — use for every dropdown / search / toolbar control */
export const CONTROL_RADIUS = 'rounded-[var(--hb-radius)]';
export const CONTROL_BORDER = 'border border-[rgba(26,92,58,0.18)]';
/** Fixed 40px height so header + toolbar controls align */
export const CONTROL_HEIGHT = 'h-10';
const CONTROL_FOCUS =
  'focus-within:border-[var(--hb-leaf)] focus-within:shadow-[0_0_0_3px_rgba(47,143,91,0.2)]';
const CONTROL_FOCUS_BTN =
  'focus-visible:border-[var(--hb-leaf)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.2)]';

/** Shared dropdown panel surface — portaled to body to avoid clip/overlap */
const DROPDOWN_PANEL =
  `fixed z-[160] max-h-[min(16rem,calc(100dvh-5rem))] overflow-y-auto overscroll-contain bg-white py-1 shadow-[var(--hb-shadow-lg)] ${CONTROL_RADIUS} ${CONTROL_BORDER}`;

const DROPDOWN_ROW = `flex w-full ${CONTROL_HEIGHT} shrink-0 items-center gap-2 whitespace-nowrap px-3 text-left text-sm font-semibold transition`;
const DROPDOWN_ROW_IDLE = 'text-[var(--hb-ink)] hover:bg-[var(--hb-mist)]';
const DROPDOWN_ROW_ACTIVE = 'bg-[var(--hb-mist)] text-[var(--hb-green)]';

const fieldClass = `w-full ${CONTROL_HEIGHT} ${CONTROL_RADIUS} ${CONTROL_BORDER} bg-white px-3 text-sm font-semibold text-[var(--hb-ink)] transition focus:border-[var(--hb-leaf)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(47,143,91,0.2)] disabled:opacity-55`;

export function TextInput({
  label,
  className = '',
  id,
  required,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const inputId = id ?? props.name;
  return (
    <label className="block text-sm font-medium text-[var(--hb-ink)]">
      {label ? (
        <span className="mb-1.5 block">
          {label}
          {required ? (
            <span className="text-[var(--hb-error)]" aria-hidden>
              {' '}
              *
            </span>
          ) : null}
        </span>
      ) : null}
      <input
        id={inputId}
        className={`${fieldClass} ${className}`}
        required={required}
        {...props}
      />
    </label>
  );
}

/**
 * Search field with utility (Bold) search icon outside the text flow.
 * `md` matches header control height (h-10); `lg` is for the hero.
 */
export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: 'md' | 'lg' }
>(function SearchInput({ className = '', size = 'md', ...props }, ref) {
  const shell =
    size === 'lg'
      ? `min-h-12 px-4 py-3 sm:min-h-14 sm:py-3.5`
      : `${CONTROL_HEIGHT} px-3`;
  const inputPad = size === 'lg' ? 'text-base sm:text-lg' : 'text-sm';
  const iconSize = size === 'lg' ? ICON_SIZES.md : ICON_SIZES.sm;

  return (
    <div
      className={`flex w-full items-center gap-[var(--hb-icon-gap)] bg-white text-[var(--hb-ink)] transition ${CONTROL_RADIUS} ${CONTROL_BORDER} ${CONTROL_FOCUS} ${shell} ${className}`}
    >
      <span className="hb-icon-utility shrink-0 text-[var(--hb-icon-utility-muted)]">
        {UtilityIcons.search({ size: iconSize })}
      </span>
      <input
        ref={ref}
        className={`hb-search-input flex-1 font-[inherit] font-semibold text-[inherit] placeholder:font-medium placeholder:text-[var(--hb-ink)]/40 disabled:opacity-55 ${inputPad}`}
        type="search"
        {...props}
      />
    </div>
  );
});

type PanelPos = { top: number; left: number; width: number; minWidth: number };

function useAnchoredPanel(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  opts?: { minWidth?: number; matchTriggerWidth?: boolean },
) {
  const [pos, setPos] = useState<PanelPos | null>(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const minWidth = opts?.minWidth ?? r.width;
    const width = opts?.matchTriggerWidth === false ? minWidth : Math.max(r.width, minWidth);
    let left = r.left;
    const maxLeft = window.innerWidth - width - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    setPos({ top: r.bottom + 6, left, width, minWidth });
  }, [triggerRef, opts?.minWidth, opts?.matchTriggerWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return pos;
}

function DropdownPortal({
  open,
  onClose,
  label,
  panelId,
  style,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  panelId: string;
  style: CSSProperties | undefined;
  children: ReactNode;
}) {
  if (!open || typeof document === 'undefined' || !style) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[150] cursor-default bg-transparent"
        aria-label={`Close ${label} menu`}
        onClick={onClose}
      />
      <div id={panelId} className={DROPDOWN_PANEL} style={style} role="presentation">
        {children}
      </div>
    </>,
    document.body,
  );
}

export type MenuOption = { value: string; label: string };

export type MenuSelectProps = {
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  leading?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  id?: string;
};

/**
 * Platform dropdown — fixed h-10 trigger; panel portaled to body
 * so sticky headers / overflow never clip or fight z-index.
 */
export function MenuSelect({
  value,
  options,
  onChange,
  label = 'Select',
  showLabel = false,
  placeholder = 'Select…',
  className = '',
  triggerClassName = '',
  leading,
  fullWidth = false,
  disabled,
  required,
  id,
}: MenuSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const autoId = useId();
  const triggerId = id ?? autoId;
  const pos = useAnchoredPanel(open, triggerRef, { matchTriggerWidth: true });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'shrink-0'} ${className}`}>
      {showLabel && (
        <label
          htmlFor={triggerId}
          className="mb-1.5 block text-sm font-medium text-[var(--hb-ink)]"
        >
          {label}
          {required ? (
            <span className="text-[var(--hb-error)]" aria-hidden>
              {' '}
              *
            </span>
          ) : null}
        </label>
      )}
      {!showLabel && <span className="sr-only">{label}</span>}

      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`flex ${CONTROL_HEIGHT} items-center gap-[var(--hb-icon-gap)] ${CONTROL_RADIUS} ${CONTROL_BORDER} ${CONTROL_FOCUS_BTN} bg-white px-3 text-sm font-semibold text-[var(--hb-ink)] shadow-[var(--hb-shadow-sm)] transition hover:border-[var(--hb-leaf)] disabled:opacity-55 ${fullWidth ? 'w-full justify-between' : ''} ${triggerClassName}`}
      >
        {leading && <span className="hb-icon-utility shrink-0">{leading}</span>}
        <span
          className={`min-w-0 flex-1 truncate text-left whitespace-nowrap ${!selected ? 'text-[var(--hb-ink)]/45' : ''}`}
        >
          {display}
        </span>
        <span
          className={`hb-icon-utility shrink-0 text-[var(--hb-ink)]/55 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          {UtilityIcons.chevronDown({ size: 16 })}
        </span>
      </button>

      <DropdownPortal
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        panelId={listId}
        style={
          pos
            ? { top: pos.top, left: pos.left, width: pos.width, minWidth: pos.minWidth }
            : undefined
        }
      >
        <ul role="listbox" aria-label={label}>
          {options.length === 0 ? (
            <li className={`${DROPDOWN_ROW} text-[var(--hb-ink)]/50`}>No options</li>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`${DROPDOWN_ROW} ${isSelected ? DROPDOWN_ROW_ACTIVE : DROPDOWN_ROW_IDLE}`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DropdownPortal>
    </div>
  );
}

/**
 * Form dropdown — MenuSelect with labelled + full-width defaults.
 * Prefer this (or MenuSelect / Select) over native `<select>` everywhere.
 */
export function SelectInput({
  label,
  showLabel = true,
  fullWidth = true,
  ...props
}: MenuSelectProps) {
  return (
    <MenuSelect
      label={label}
      showLabel={showLabel}
      fullWidth={fullWidth}
      {...props}
    />
  );
}

/** Alias for the platform dropdown. */
export const Select = MenuSelect;

export type MenuMultiSelectProps = {
  value: string[];
  options: MenuOption[];
  onChange: (value: string[]) => void;
  label?: string;
  showLabel?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  id?: string;
};

/**
 * Multi-select dropdown — same chrome as MenuSelect; stays open while toggling.
 */
export function MenuMultiSelect({
  value,
  options,
  onChange,
  label = 'Select',
  showLabel = false,
  placeholder = 'Select…',
  className = '',
  triggerClassName = '',
  fullWidth = false,
  disabled,
  id,
}: MenuMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const autoId = useId();
  const triggerId = id ?? autoId;
  const pos = useAnchoredPanel(open, triggerRef, { matchTriggerWidth: true });
  const selected = new Set(value);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function toggle(optValue: string) {
    if (selected.has(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  const selectedLabels = options
    .filter((o) => selected.has(o.value))
    .map((o) => o.label);
  const display =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} selected`;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'shrink-0'} ${className}`}>
      {showLabel && (
        <label
          htmlFor={triggerId}
          className="mb-1.5 block text-sm font-medium text-[var(--hb-ink)]"
        >
          {label}
        </label>
      )}
      {!showLabel && <span className="sr-only">{label}</span>}

      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`flex ${CONTROL_HEIGHT} items-center gap-[var(--hb-icon-gap)] ${CONTROL_RADIUS} ${CONTROL_BORDER} ${CONTROL_FOCUS_BTN} bg-white px-3 text-sm font-semibold text-[var(--hb-ink)] shadow-[var(--hb-shadow-sm)] transition hover:border-[var(--hb-leaf)] disabled:opacity-55 ${fullWidth ? 'w-full justify-between' : ''} ${triggerClassName}`}
      >
        <span
          className={`min-w-0 flex-1 truncate text-left whitespace-nowrap ${selectedLabels.length === 0 ? 'text-[var(--hb-ink)]/45' : ''}`}
        >
          {display}
        </span>
        <span
          className={`hb-icon-utility shrink-0 text-[var(--hb-ink)]/55 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          {UtilityIcons.chevronDown({ size: 16 })}
        </span>
      </button>

      <DropdownPortal
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        panelId={listId}
        style={
          pos
            ? {
                top: pos.top,
                left: pos.left,
                width: pos.width,
                minWidth: pos.minWidth,
              }
            : undefined
        }
      >
        <ul role="listbox" aria-multiselectable aria-label={label}>
          {options.length === 0 ? (
            <li className={`${DROPDOWN_ROW} text-[var(--hb-ink)]/50`}>
              No options
            </li>
          ) : (
            options.map((opt) => {
              const isSelected = selected.has(opt.value);
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`${DROPDOWN_ROW} ${isSelected ? DROPDOWN_ROW_ACTIVE : DROPDOWN_ROW_IDLE}`}
                    onClick={() => toggle(opt.value)}
                  >
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                        isSelected
                          ? 'border-[var(--hb-green)] bg-[var(--hb-green)] text-white'
                          : 'border-[rgba(26,92,58,0.28)] bg-white'
                      }`}
                      aria-hidden
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DropdownPortal>
    </div>
  );
}

type LocationSelectProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
  variant?: 'pill' | 'field';
  className?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
};

function LocationActionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--hb-green)] shadow-[var(--hb-shadow-sm)] ring-1 ring-[rgba(26,92,58,0.1)]">
      {children}
    </span>
  );
}

/**
 * Area picker — pill trigger; Chaldal-style locate / change-city menu.
 * Panel is portaled so it never clips under the sticky header.
 */
export function LocationSelect({
  value,
  options,
  onChange,
  label = 'Delivery area',
  variant = 'pill',
  className = '',
  placeholder = 'Select area',
  required,
  id,
  disabled,
}: LocationSelectProps) {
  const isCompact = variant === 'pill';

  if (!isCompact) {
    return (
      <MenuSelect
        id={id}
        label={label}
        showLabel
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        options={options.map((o) => ({ value: o, label: o }))}
        onChange={onChange}
        fullWidth
        className={className}
      />
    );
  }

  const [open, setOpen] = useState(false);
  const [pickingCity, setPickingCity] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const autoId = useId();
  const triggerId = id ?? autoId;
  const display = value || placeholder;
  const pos = useAnchoredPanel(open, triggerRef, {
    minWidth: 280,
    matchTriggerWidth: false,
  });

  useEffect(() => {
    if (!open) {
      setPickingCity(false);
      setLocateMsg(null);
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function useCurrentLocation() {
    setLocateMsg(null);
    if (!navigator.geolocation) {
      setLocateMsg('Location not supported — choose a city');
      setPickingCity(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        if (value) setOpen(false);
        else {
          setPickingCity(true);
          setLocateMsg('Choose your delivery area');
        }
      },
      () => {
        setLocateMsg('Could not detect location — choose a city');
        setPickingCity(true);
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }

  const actionRow =
    'flex w-full shrink-0 items-center gap-3 whitespace-nowrap px-3 py-2.5 text-left text-sm font-semibold text-[var(--hb-ink)] transition hover:bg-[var(--hb-mist)] focus-visible:bg-[var(--hb-mist)] focus-visible:outline-none';

  return (
    <div className={`relative shrink-0 ${className}`}>
      <span className="sr-only">{label}</span>

      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        disabled={disabled || options.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`flex ${CONTROL_HEIGHT} max-w-[11rem] items-center gap-[var(--hb-icon-gap)] ${CONTROL_RADIUS} ${CONTROL_BORDER} ${CONTROL_FOCUS_BTN} bg-white px-3 text-sm font-semibold text-[var(--hb-green)] shadow-[var(--hb-shadow-sm)] transition hover:border-[var(--hb-leaf)] disabled:opacity-55`}
      >
        <span className="hb-icon-utility shrink-0 text-[var(--hb-green)]">
          {UtilityIcons.location({ size: ICON_SIZES.sm })}
        </span>
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">
          {display}
        </span>
        <span
          className={`hb-icon-utility shrink-0 text-[var(--hb-green)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          {UtilityIcons.chevronDown({ size: 16 })}
        </span>
      </button>

      <DropdownPortal
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        panelId={listId}
        style={
          pos
            ? {
                top: pos.top,
                left: pos.left,
                width: pos.width,
                minWidth: pos.minWidth,
              }
            : undefined
        }
      >
        {!pickingCity ? (
          <div role="menu" aria-label={label}>
            <button
              type="button"
              role="menuitem"
              className={actionRow}
              onClick={useCurrentLocation}
            >
              <LocationActionIcon>
                {UtilityIcons.locate({ size: ICON_SIZES.sm })}
              </LocationActionIcon>
              <span className="whitespace-nowrap">Use my current location</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={actionRow}
              onClick={() => setPickingCity(true)}
            >
              <LocationActionIcon>
                {UtilityIcons.location({ size: ICON_SIZES.sm })}
              </LocationActionIcon>
              <span className="whitespace-nowrap">Change city</span>
            </button>
          </div>
        ) : (
          <ul role="listbox" aria-label="Choose city">
            <li>
              <button
                type="button"
                className={`${DROPDOWN_ROW} ${DROPDOWN_ROW_IDLE} text-xs uppercase tracking-wide text-[var(--hb-ink)]/45`}
                onClick={() => {
                  setPickingCity(false);
                  setLocateMsg(null);
                }}
              >
                {UtilityIcons.chevronDown({ size: 14, className: 'rotate-90' })}
                Back
              </button>
            </li>
            {locateMsg && (
              <li className="px-3 pb-2 text-xs font-medium text-[var(--hb-ink)]/55">
                {locateMsg}
              </li>
            )}
            {options.map((opt) => {
              const isSelected = opt === value;
              return (
                <li key={opt} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`${DROPDOWN_ROW} ${isSelected ? DROPDOWN_ROW_ACTIVE : DROPDOWN_ROW_IDLE}`}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    <span className="hb-icon-utility text-[var(--hb-green)]">
                      {UtilityIcons.location({ size: 16 })}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownPortal>
    </div>
  );
}
