import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { NAV_ITEMS } from '../../lib/navigation.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Avatar from '../Avatar.jsx';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SettingsIcon, UsersIcon, XIcon } from '../icons.jsx';
import './AppSidebar.css';

const SECTIONS = [
  ['Workspace', ['Overview', 'My Tasks', 'Kanban Board', 'Ticketing', 'Notes']],
  ['Students', ['Students', 'Bookings', 'Client Accounts', 'Visa']],
  ['Finance', ['Payments', 'Expenses', 'Performance']],
  ['Operations', ['Operations']],
];
const SECTION_KEY = 'jeexpert:sidebar:sections';
function initialSections() {
  try { const value = JSON.parse(localStorage.getItem(SECTION_KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}
function SignOutIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H4v16h5M13 7l5 5-5 5M8 12h10" /></svg>;
}
function NavItem({ item, compact, active, onNavigate }) {
  const Icon = item.icon;
  return <Link to={item.taskView ? `${item.path}?view=${item.taskView}` : item.path}
    onClick={onNavigate} title={compact ? item.label : undefined} aria-label={compact ? item.label : undefined}
    aria-current={active ? 'page' : undefined}
    className={`jxp-sidebar-link ${active ? 'is-active' : ''} ${compact ? 'is-compact' : ''}`}>
    <Icon size={18} className="shrink-0" />
    {!compact && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
    {active && <span className="jxp-sidebar-indicator" />}
  </Link>;
}
export default function AppSidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentUser] = useCurrentUser();
  const { user, logout } = useAuth();
  const [closedSections, setClosedSections] = useState(initialSections);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(SECTION_KEY, JSON.stringify(closedSections)); } catch { /* Preferences remain in memory. */ }
  }, [closedSections]);
  useEffect(() => {
    if (!mobileOpen) return;
    const escape = (event) => { if (event.key === 'Escape') onCloseMobile(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [mobileOpen, onCloseMobile]);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try { await logout(); } catch (err) { setLogoutError(err.message); }
    finally { setLoggingOut(false); }
  };
  const isActive = (item) => {
    if (item.path === '/prospects' && location.pathname.startsWith('/students/')) return true;
    if (item.matchPrefix) return location.pathname.startsWith(item.path);
    if (item.path !== '/tasks') return location.pathname === item.path;
    return location.pathname === '/tasks' && (searchParams.get('view') || 'list') === item.taskView;
  };
  const sections = SECTIONS.map(([label, names]) => ({ label, items: names.map((name) => NAV_ITEMS.find((item) => item.label === name)).filter(Boolean) }));
  if (user.isAdmin || user.role === 'View') sections.push({ label: 'Administration', items: [{ path: '/admin/users', label: 'Users', icon: UsersIcon }] });
  const content = (compact, mobile = false) => <div className={`jxp-sidebar ${compact ? 'is-compact' : ''}`}>
    <div className={`jxp-sidebar-brand ${compact ? 'is-compact' : ''}`}>
      <Link to="/" onClick={onCloseMobile} aria-label="JEEXPERT overview" className="block">
        <img src={`/images/jeexpert/${compact ? 'sidebar-icon-J.png' : 'sidebar-logo-blue.png'}`}
          alt="JEEXPERT" className={compact ? 'h-11 w-11 object-contain' : 'h-[132px] w-[164px] object-contain'} />
      </Link>
      {mobile ? <button type="button" onClick={onCloseMobile} className="jxp-sidebar-brand-control" aria-label="Close menu"><XIcon size={18} /></button>
        : <button type="button" onClick={onToggleCollapse} className="jxp-sidebar-brand-control" aria-label={compact ? 'Expand menu' : 'Collapse menu'} aria-expanded={!compact}>
          {compact ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}</button>}
    </div>
    <nav aria-label="Main navigation" className="jxp-sidebar-nav scroll-thin">
      {sections.map(({ label, items }) => <div key={label} className="jxp-sidebar-section">
        {compact ? <div className="jxp-sidebar-divider" /> : <button type="button" className="jxp-sidebar-section-heading"
          aria-expanded={!closedSections[label]} aria-controls={`${mobile ? 'mobile' : 'desktop'}-nav-${label.toLowerCase()}`}
          onClick={() => setClosedSections((previous) => ({ ...previous, [label]: !previous[label] }))}>
          <span>{label}</span><ChevronDownIcon size={13} className={`transition-transform ${closedSections[label] ? '-rotate-90' : ''}`} />
        </button>}
        <div id={`${mobile ? 'mobile' : 'desktop'}-nav-${label.toLowerCase()}`} hidden={!compact && !!closedSections[label]} className="space-y-1">
          {items.map((item) => <NavItem key={item.label} item={item} compact={compact} active={isActive(item)} onNavigate={onCloseMobile} />)}
        </div>
      </div>)}
    </nav>
    <div className="jxp-sidebar-footer">
      <div className={`flex items-center gap-2.5 ${compact ? 'flex-col' : ''}`}>
        <Avatar fullName={currentUser} seed={currentUser} size={36} />
        {!compact && <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{currentUser}</span>
          <span className="block truncate text-[11px] text-[#64748B]">{user.role === 'Admin' ? 'Administrator' : user.role || 'Editor'}</span>
        </div>}
        <details className="jxp-sidebar-settings">
          <summary className="jxp-sidebar-icon-button" aria-label="Menu settings" title="Menu settings"><SettingsIcon size={18} /></summary>
          <div className="jxp-sidebar-settings-panel">
            <p className="mb-2 text-sm font-semibold">Menu settings</p>
            <button type="button" className="jxp-sidebar-settings-action" onClick={() => setClosedSections({})}>Expand all sections</button>
            <button type="button" className="jxp-sidebar-settings-action" onClick={() => setClosedSections(Object.fromEntries(sections.map((section) => [section.label, true])))}>Fold all sections</button>
          </div>
        </details>
      </div>
      <div className={`mt-3 flex ${compact ? 'flex-col' : 'items-center'}`}>
        <button type="button" disabled={loggingOut} onClick={handleLogout} title="Sign out" aria-label={loggingOut ? 'Signing out' : 'Sign out'}
          className={`jxp-sidebar-footer-button ${compact ? 'justify-center' : 'flex-1'}`}>
          <SignOutIcon />{!compact && <span>{loggingOut ? 'Signing out…' : 'Sign out'}</span>}
        </button>
        {!mobile && <button type="button" onClick={onToggleCollapse} title={compact ? 'Expand menu' : 'Collapse menu'}
          aria-label={compact ? 'Expand menu' : 'Collapse menu'} className={`jxp-sidebar-footer-button ${compact ? 'justify-center' : 'border-l border-[#E7EDF3] pl-3'}`}>
          {compact ? <ChevronRightIcon size={18} /> : <><ChevronLeftIcon size={18} /><span>Collapse</span></>}
        </button>}
      </div>
      {logoutError && <p role="alert" className="mt-2 break-words text-xs text-red-700">{logoutError}</p>}
    </div>
  </div>;
  return <>
    <aside className={`hidden h-full shrink-0 transition-[width] duration-200 motion-reduce:transition-none lg:block ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
      {content(collapsed)}
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
      <div className="relative z-10 h-full w-[260px] max-w-[calc(100vw-3rem)] shadow-xl">{content(false, true)}</div>
    </div>}
  </>;
}
