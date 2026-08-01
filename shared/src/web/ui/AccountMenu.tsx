import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ICON_SIZES, UtilityIcons } from '../../../icons';
import { UserAvatar } from './UserAvatar';

export type AccountMenuItem = {
  key: string;
  label: string;
  to?: string;
  href?: string;
  icon?: 'home' | 'account' | 'package' | 'logout';
  danger?: boolean;
  onClick?: () => void;
};

type Props = {
  email?: string | null;
  roleLabel?: string | null;
  avatarUrl?: string | null;
  /** Extra items between the profile card and logout */
  items?: AccountMenuItem[];
  profileTo?: string;
  onLogout: () => void;
  /** Use portal + fixed positioning (site chrome). Inline absolute for dashboards. */
  portal?: boolean;
  triggerClassName?: string;
};

function MenuIcon({ name }: { name: NonNullable<AccountMenuItem['icon']> }) {
  const Icon = UtilityIcons[name] ?? UtilityIcons.account;
  return <span aria-hidden>{Icon({ size: 18 })}</span>;
}

function renderItem(
  item: AccountMenuItem,
  close: () => void,
): ReactNode {
  const className = `hb-dashboard__profile-item${
    item.danger ? ' hb-dashboard__profile-item--danger' : ''
  }`;
  const content = (
    <>
      {item.icon ? <MenuIcon name={item.icon} /> : null}
      {item.label}
    </>
  );

  if (item.href) {
    return (
      <a
        key={item.key}
        role="menuitem"
        href={item.href}
        className={className}
        onClick={() => {
          close();
          item.onClick?.();
        }}
      >
        {content}
      </a>
    );
  }
  if (item.to) {
    return (
      <Link
        key={item.key}
        role="menuitem"
        to={item.to}
        className={className}
        onClick={() => {
          close();
          item.onClick?.();
        }}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      key={item.key}
      type="button"
      role="menuitem"
      className={className}
      onClick={() => {
        close();
        item.onClick?.();
      }}
    >
      {content}
    </button>
  );
}

/** Shared account avatar trigger + dropdown for site chrome and dashboards. */
export function AccountMenu({
  email,
  roleLabel,
  avatarUrl,
  items = [],
  profileTo,
  onLogout,
  portal = false,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        // For portal menus the panel is outside rootRef — handled by scrim
        if (!portal) setOpen(false);
      }
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
  }, [open, portal]);

  useEffect(() => {
    if (!open || !portal) {
      setPos(null);
      return;
    }
    const el = btnRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, portal]);

  const close = () => setOpen(false);

  const menuItems: AccountMenuItem[] = [
    ...items,
    ...(profileTo
      ? [
          {
            key: 'profile',
            label: 'My Profile',
            to: profileTo,
            icon: 'account' as const,
          },
        ]
      : []),
    {
      key: 'logout',
      label: 'Sign out',
      icon: 'logout' as const,
      danger: true,
      onClick: onLogout,
    },
  ];

  const menuStyle: CSSProperties | undefined = portal
    ? {
        position: 'fixed',
        top: pos?.top ?? 0,
        right: pos?.right ?? 0,
        left: 'auto',
        zIndex: 80,
      }
    : undefined;

  const menu = open ? (
    <div
      role="menu"
      className="hb-dashboard__profile-menu"
      style={menuStyle}
    >
      <div className="hb-dashboard__profile-card">
        <UserAvatar label={email} src={avatarUrl} size="lg" />
        <div className="hb-dashboard__profile-card-text">
          <p className="hb-dashboard__profile-card-name" title={email ?? undefined}>
            {email ?? 'Account'}
          </p>
          {roleLabel ? (
            <p className="hb-dashboard__profile-card-role">{roleLabel}</p>
          ) : null}
        </div>
      </div>
      <div className="hb-dashboard__profile-sep" />
      {menuItems.map((item) => renderItem(item, close))}
    </div>
  ) : null;

  return (
    <div className="hb-account-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className={triggerClassName ?? 'hb-dashboard__profile-trigger'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar label={email} src={avatarUrl} />
      </button>
      {portal && open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[70] cursor-default bg-transparent"
                aria-label="Close account menu"
                onClick={close}
              />
              {pos ? menu : null}
            </>,
            document.body,
          )
        : menu}
    </div>
  );
}

/** Convenience re-export size constant for callers that need icon alignment */
export const ACCOUNT_MENU_ICON_SM = ICON_SIZES.sm;
