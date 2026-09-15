import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { NAV_ITEMS } from '../../lib/navigation.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { ASSIGNEES } from '../../lib/config.js';
import Avatar from '../Avatar.jsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
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
          ? 'bg-white/10 text-white'
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
  const [currentUser, setCurrentUser] = useCurrentUser();

  const isActive = (item) => {
    if (item.matchPrefix) return location.pathname.startsWith(item.path);
    if (item.path !== '/tasks') return location.pathname === item.path;
    const view = searchParams.get('view') || 'list';
    return location.pathname === '/tasks' && view === item.taskView;
  };

  const content = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold text-sm font-bold text-navy">
          J
        </span>
        {!collapsed && (
          <span className="truncate text-sm font-semibold tracking-wide">
            JEExpert
          </span>
        )}
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-auto rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Fermer le menu"
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
                  className={`px-3 pb-1.5 ${index === 0 ? 'pt-0' : 'pt-3'} text-[10px] font-semibold uppercase tracking-wider text-white/40`}
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
      </nav>

      <div className="space-y-1 border-t border-white/10 px-2.5 py-3">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <Avatar fullName={currentUser} seed={currentUser} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="sidebar-current-user">
                Utilisateur actuel
              </label>
              <select
                id="sidebar-current-user"
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                className="w-full truncate rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs font-medium text-white outline-none"
              >
                {ASSIGNEES.map((name) => (
                  <option key={name} value={name} className="text-text-strong">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/5 hover:text-white lg:flex"
        >
          {collapsed ? (
            <ChevronRightIcon size={16} />
          ) : (
            <>
              <ChevronLeftIcon size={16} />
              Réduire
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
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full w-72 shadow-xl">{content}</div>
        </div>
      )}
    </>
  );
}
