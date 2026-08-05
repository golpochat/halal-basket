import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ICON_SIZES,
  UtilityIcons,
  type UtilityIconName,
} from '../../../icons';
import { AccountMenu } from './AccountMenu';
import { IconButton } from './IconButton';
import { Tooltip } from './Tooltip';

export type DashboardNavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon?: UtilityIconName;
};

export type DashboardShellProps = {
  brandLabel?: string;
  brand: ReactNode;
  brandCollapsed?: ReactNode;
  homeTo?: string;
  profileTo?: string;
  nav: DashboardNavItem[];
  /** Optional controls rendered under sidebar nav (e.g. toggles). */
  sidebarNavExtra?: ReactNode;
  /** Optional controls in the header before the account menu (e.g. locale pickers). */
  headerExtra?: ReactNode;
  title?: string;
  userLabel?: string | null;
  userRoleLabel?: string | null;
  avatarUrl?: string | null;
  onLogout: () => void;
  children?: ReactNode;
  compact?: boolean;
  footerNote?: string;
  storageKey?: string;
  signOutLabel?: string;
  myProfileLabel?: string;
};

const TitleCtx = createContext<(title: string) => void>(() => undefined);

export function useDashboardTitle(title: string) {
  const setTitle = useContext(TitleCtx);
  useEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [setTitle, title]);
}

function matchNavTitle(pathname: string, nav: DashboardNavItem[]): string | null {
  const sorted = [...nav].sort((a, b) => b.to.length - a.to.length);
  for (const item of sorted) {
    if (item.end) {
      if (pathname === item.to) return item.label;
    } else if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
      return item.label;
    }
  }
  return null;
}

export function DashboardShell({
  brandLabel,
  brand,
  brandCollapsed,
  homeTo = '/dashboard',
  profileTo,
  nav,
  sidebarNavExtra,
  headerExtra,
  title: titleProp,
  userLabel,
  userRoleLabel,
  avatarUrl,
  onLogout,
  children,
  compact = false,
  footerNote = `© ${new Date().getFullYear()} Halal Basket. All rights reserved.`,
  storageKey = 'hb-dash-sidebar-collapsed',
  signOutLabel,
  myProfileLabel,
}: DashboardShellProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(storageKey) === '1';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');

  const setTitle = useCallback((t: string) => setPageTitle(t), []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, collapsed ? '1' : '0');
  }, [collapsed, storageKey]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navTitle = useMemo(
    () => matchNavTitle(location.pathname, nav),
    [location.pathname, nav],
  );
  const headerTitle = pageTitle || titleProp || navTitle || brandLabel || 'Dashboard';
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 640px)').matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileOpen(false);
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const menuExpanded = isDesktop ? !collapsed : mobileOpen;

  function toggleSidebar() {
    if (isDesktop) {
      setCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  }

  return (
    <TitleCtx.Provider value={setTitle}>
      <div
        className={[
          'hb-dashboard',
          collapsed ? 'is-collapsed' : '',
          mobileOpen ? 'is-mobile-open' : '',
          compact ? 'is-compact' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {mobileOpen ? (
          <button
            type="button"
            className="hb-dashboard__scrim"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside className="hb-dashboard__sidebar" aria-label="Sidebar">
          <div className="hb-dashboard__sidebar-brand">
            <Tooltip
              content={brandLabel ?? 'Home'}
              disabled={!collapsed}
              block
            >
              <Link
                to={homeTo}
                aria-label="Home"
                className="hb-dashboard__sidebar-brand-link"
                onClick={() => setMobileOpen(false)}
              >
                <span className="hb-dashboard__brand-full">{brand}</span>
                <span className="hb-dashboard__brand-mini">
                  {brandCollapsed ?? brand}
                </span>
                {brandLabel ? (
                  <span className="hb-dashboard__brand-label">{brandLabel}</span>
                ) : null}
              </Link>
            </Tooltip>
          </div>
          <nav className="hb-dashboard__sidebar-nav" aria-label="Dashboard">
            {nav.map((item) => {
              const iconName = item.icon ?? 'grid';
              const Icon = UtilityIcons[iconName] ?? UtilityIcons.grid;
              return (
                <Tooltip
                  key={item.to}
                  content={item.label}
                  disabled={!collapsed}
                  side="right"
                  block
                >
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `hb-dashboard__nav-link${isActive ? ' is-active' : ''}`
                    }
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="hb-dashboard__nav-icon" aria-hidden>
                      {Icon({ size: ICON_SIZES.sm })}
                    </span>
                    <span className="hb-dashboard__nav-label">{item.label}</span>
                  </NavLink>
                </Tooltip>
              );
            })}
            {sidebarNavExtra ? (
              <div className="hb-dashboard__sidebar-nav-extra">{sidebarNavExtra}</div>
            ) : null}
          </nav>
        </aside>

        <div className="hb-dashboard__main-col">
          <header className="hb-dashboard__header">
            <div className="hb-dashboard__header-row">
              <div className="hb-dashboard__header-left">
                <IconButton
                  className="hb-dashboard__menu-btn"
                  label={menuExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                  aria-expanded={menuExpanded}
                  onClick={toggleSidebar}
                >
                  <span
                    className={`hb-menu-swap ${menuExpanded ? 'is-expanded' : ''}`}
                    aria-hidden
                  >
                    <span className="hb-menu-swap__a">
                      {UtilityIcons.close({ size: ICON_SIZES.sm })}
                    </span>
                    <span className="hb-menu-swap__b">
                      {UtilityIcons.menu({ size: ICON_SIZES.sm })}
                    </span>
                  </span>
                </IconButton>
                <h1 className="hb-dashboard__page-title">{headerTitle}</h1>
              </div>

              <div className="hb-dashboard__header-actions">
                {headerExtra}
                <AccountMenu
                  email={userLabel}
                  roleLabel={userRoleLabel}
                  avatarUrl={avatarUrl}
                  profileTo={profileTo}
                  onLogout={onLogout}
                  signOutLabel={signOutLabel}
                  myProfileLabel={myProfileLabel}
                />
              </div>
            </div>
          </header>

          <main className="hb-dashboard__content">
            <div className="hb-fade-up">{children ?? <Outlet />}</div>
          </main>

          <footer className="hb-dashboard__footer">
            <p>{footerNote}</p>
          </footer>
        </div>
      </div>
    </TitleCtx.Provider>
  );
}
