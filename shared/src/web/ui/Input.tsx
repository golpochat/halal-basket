import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
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

const fieldClass = `w-full ${CONTROL_HEIGHT} ${CONTROL_RADIUS} ${CONTROL_BORDER} bg-white px-3 text-sm font-semibold text-[var(--hb-ink)] transition focus:border-[var(--hb-leaf)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(47,143,91,0.2)] disabled:opacity-55`;

export function TextInput({
  label,
  className = '',
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const inputId = id ?? props.name;
  return (
    <label className="block text-sm font-medium text-[var(--hb-ink)]">
      {label && <span className="mb-1.5 block">{label}</span>}
      <input id={inputId} className={`${fieldClass} ${className}`} {...props} />
    </label>
  );
}

export function SelectInput({
  label,
  className = '',
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
}) {
  const selectId = id ?? props.name;
  return (
    <label className="block text-sm font-medium text-[var(--hb-ink)]">
      {label && <span className="mb-1.5 block">{label}</span>}
      <select
        id={selectId}
        className={`${fieldClass} ${className}`}
        {...props}
      >
        {children}
      </select>
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
  const iconSize = size === 'lg' ? ICON_SIZES.sm : 20;

  return (
    <div
      className={`flex w-full items-center gap-[var(--hb-icon-gap)] bg-white text-[var(--hb-ink)] transition ${CONTROL_RADIUS} ${CONTROL_BORDER} ${CONTROL_FOCUS} ${shell} ${className}`}
    >
      <span className="hb-icon-utility shrink-0 text-[var(--hb-icon-utility-muted)]">
        {UtilityIcons.search({ size: iconSize })}
      </span>
      <input
        ref={ref}
        className={`min-w-0 flex-1 border-0 bg-transparent font-[inherit] font-semibold text-[inherit] outline-none placeholder:font-medium placeholder:text-[var(--hb-ink)]/40 disabled:opacity-55 ${inputPad}`}
        type="search"
        {...props}
      />
    </div>
  );
});

export type MenuOption = { value: string; label: string };

type MenuSelectProps = {
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
 * Platform dropdown — fixed h-10 trigger, matching list row height,
 * same radius/border as SearchInput. Prefer this over native `<select>`.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const autoId = useId();
  const triggerId = id ?? autoId;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  return (
    <div
      ref={rootRef}
      className={`relative ${fullWidth ? 'w-full' : 'shrink-0'} ${className}`}
    >
      {showLabel && (
        <label
          htmlFor={triggerId}
          className="mb-1.5 block text-sm font-medium text-[var(--hb-ink)]"
        >
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      {!showLabel && <span className="sr-only">{label}</span>}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <button
            type="button"
            className="fixed inset-0 z-[35] cursor-default bg-[rgba(19,38,28,0.28)]"
            aria-label={`Close ${label} menu`}
            onClick={() => setOpen(false)}
          />,
          document.body,
        )}

      <button
        type="button"
        id={triggerId}
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`relative z-[45] flex ${CONTROL_HEIGHT} items-center gap-[var(--hb-icon-gap)] ${CONTROL_RADIUS} ${CONTROL_BORDER} ${CONTROL_FOCUS_BTN} bg-white px-3 text-sm font-semibold text-[var(--hb-ink)] shadow-[var(--hb-shadow-sm)] transition hover:border-[var(--hb-leaf)] disabled:opacity-55 ${fullWidth ? 'w-full justify-between' : ''} ${triggerClassName}`}
      >
        {leading && <span className="hb-icon-utility shrink-0">{leading}</span>}
        <span
          className={`min-w-0 flex-1 truncate text-left ${!selected ? 'text-[var(--hb-ink)]/45' : ''}`}
        >
          {display}
        </span>
        <span
          className={`hb-icon-utility shrink-0 text-[var(--hb-ink)]/55 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          {UtilityIcons.chevronDown({ size: 16 })}
        </span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className={`absolute z-[45] mt-1.5 max-h-60 overflow-auto bg-white py-1 shadow-[var(--hb-shadow-lg)] ${CONTROL_RADIUS} ${CONTROL_BORDER} ${
            fullWidth ? 'inset-x-0' : 'left-0 min-w-full'
          }`}
        >
          {options.length === 0 ? (
            <li
              className={`flex ${CONTROL_HEIGHT} items-center px-3 text-sm font-semibold text-[var(--hb-ink)]/50`}
            >
              No options
            </li>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`flex w-full ${CONTROL_HEIGHT} items-center px-3 text-left text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
                        : 'text-[var(--hb-ink)] hover:bg-[var(--hb-mist)]'
                    }`}
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
      )}
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
 * Area picker — pill trigger matches header chrome;
 * open menu follows Chaldal-style actions (locate / change city).
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
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const autoId = useId();
  const triggerId = id ?? autoId;
  const display = value || placeholder;

  useEffect(() => {
    if (!open) {
      setPickingCity(false);
      setLocateMsg(null);
      return;
    }
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
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
        // Areas are name-based in MVP; confirm current selection or open picker.
        if (value) {
          setOpen(false);
        } else {
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

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <span className="sr-only">{label}</span>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <button
            type="button"
            className="fixed inset-0 z-[35] cursor-default bg-transparent"
            aria-label={`Close ${label} menu`}
            onClick={() => setOpen(false)}
          />,
          document.body,
        )}

      <button
        type="button"
        id={triggerId}
        disabled={disabled || options.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`relative z-[45] flex ${CONTROL_HEIGHT} max-w-[11rem] items-center gap-[var(--hb-icon-gap)] ${CONTROL_RADIUS} ${CONTROL_BORDER} ${CONTROL_FOCUS_BTN} bg-white px-3 text-sm font-semibold text-[var(--hb-green)] shadow-[var(--hb-shadow-sm)] transition hover:border-[var(--hb-leaf)] disabled:opacity-55`}
      >
        <span className="hb-icon-utility shrink-0 text-[var(--hb-green)]">
          {UtilityIcons.location({ size: 18 })}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{display}</span>
        <span
          className={`hb-icon-utility shrink-0 text-[var(--hb-green)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          {UtilityIcons.chevronDown({ size: 16 })}
        </span>
      </button>

      {open && (
        <div
          id={listId}
          role="menu"
          aria-label={label}
          className={`absolute left-0 z-[45] mt-1.5 min-w-[16.5rem] overflow-hidden bg-white py-1 shadow-[var(--hb-shadow-lg)] ${CONTROL_RADIUS} ${CONTROL_BORDER}`}
        >
          {!pickingCity ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-[var(--hb-ink)] transition hover:bg-[var(--hb-mist)] focus-visible:bg-[var(--hb-mist)] focus-visible:outline-none"
                onClick={useCurrentLocation}
              >
                <LocationActionIcon>
                  {UtilityIcons.locate({ size: 18 })}
                </LocationActionIcon>
                Use my current location
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-[var(--hb-ink)] transition hover:bg-[var(--hb-mist)] focus-visible:bg-[var(--hb-mist)] focus-visible:outline-none"
                onClick={() => setPickingCity(true)}
              >
                <LocationActionIcon>
                  {UtilityIcons.location({ size: 18 })}
                </LocationActionIcon>
                Change city
              </button>
            </>
          ) : (
            <ul role="listbox" aria-label="Choose city" className="max-h-60 overflow-auto py-1">
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45 hover:bg-[var(--hb-mist)]"
                  onClick={() => {
                    setPickingCity(false);
                    setLocateMsg(null);
                  }}
                >
                  {UtilityIcons.chevronDown({
                    size: 14,
                    className: 'rotate-90',
                  })}
                  Back
                </button>
              </li>
              {locateMsg && (
                <li className="px-3 pb-1 text-xs text-[var(--hb-ink)]/55">
                  {locateMsg}
                </li>
              )}
              {options.map((opt) => {
                const isSelected = opt === value;
                return (
                  <li key={opt} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={`flex w-full ${CONTROL_HEIGHT} items-center gap-2 px-3 text-left text-sm font-semibold transition ${
                        isSelected
                          ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
                          : 'text-[var(--hb-ink)] hover:bg-[var(--hb-mist)]'
                      }`}
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
        </div>
      )}
    </div>
  );
}

