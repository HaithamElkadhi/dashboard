import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { NAV_ITEMS } from '../../lib/navigation.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useState } from 'react';
import BrandLogo from '../BrandLogo.jsx';
import Avatar from '../Avatar.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  UsersIcon,
} from '../icons.jsx';

function NavItem({ item, collapsed, active, onNavigate }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.taskView ? `${item.path}?view=${item.taskView}` : item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-accent/20 text-white ring-1 ring-inset ring-accent/30'
          : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </Link>
  );
}

export default function AppSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentUser] = useCurrentUser();
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    setLoggingOut(true); setLogoutError('');
    try { await logout(); } catch (err) { setLogoutError(err.message); }
    finally { setLoggingOut(false); }
  };

  const isActive = (item) => {
    if (item.matchPrefix) return location.pathname.startsWith(item.path);
    if (item.path !== '/tasks') return location.pathname === item.path;
    const view = searchParams.get('view') || 'list';
    return location.pathname === '/tasks' && view === item.taskView;
  };

  const content = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <Link to="/" onClick={onCloseMobile} aria-label="JEEXPERT overview" className="block min-w-0">
          <BrandLogo variant={collapsed ? 'icon' : 'white'} className={collapsed ? 'h-10 w-10 rounded-lg' : 'w-[176px]'} />
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-auto min-h-11 min-w-11 rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Close menu"
        >
          <XIcon size={16} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-2 scroll-thin">
        {NAV_ITEMS.map((item, index) => {
          const prevSection = NAV_ITEMS[index - 1]?.section;
          const showSectionHeader = item.section && item.section !== prevSection;
          return (
            <div key={item.label}>
              {showSectionHeader && (
                <div
                  className={`px-3 pb-1.5 ${index === 0 ? 'pt-0' : 'pt-3'} text-[10px] font-semibold uppercase tracking-wider text-white/70`}
                >
                  {!collapsed && item.section}
                </div>
              )}
              <NavItem
                item={item}
                collapsed={collapsed}
                active={isActive(item)}
                onNavigate={onCloseMobile}
              />
            </div>
          );
        })}
        {user.isAdmin && <div>
          {!collapsed && <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wider text-white/70">Administration</div>}
          <NavItem item={{ path: '/admin/users', label: 'Users', icon: UsersIcon }} collapsed={collapsed} active={location.pathname === '/admin/users'} onNavigate={onCloseMobile} />
        </div>}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-2.5 py-3">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <Avatar fullName={currentUser} seed={currentUser} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{currentUser}</span>
            </div>
          )}
        </div>

        <button type="button" disabled={loggingOut} onClick={handleLogout} title="Sign out" className="w-full rounded-lg px-2 py-2 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50">{collapsed ? '↪' : loggingOut ? 'Signing out…' : 'Sign out'}</button>
        {logoutError && <p role="alert" className="text-xs text-red-200">{logoutError}</p>}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5 hover:text-white lg:flex"
        >
          {collapsed ? (
            <ChevronRightIcon size={16} />
          ) : (
            <>
              <ChevronLeftIcon size={16} />
              Collapse
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden h-full shrink-0 transition-[width] duration-200 lg:block ${
          collapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full w-72 shadow-xl">{content}</div>
        </div>
      )}
    </>
  );
}
