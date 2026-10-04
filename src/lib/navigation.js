// Single source of truth for the sidebar's nav items and the header's page
// titles, so both stay in sync as pages are added.
import {
  CalendarIcon,
  ChartBarIcon,
  FolderIcon,
  HomeIcon,
  KanbanIcon,
  KeyIcon,
  ListChecksIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
} from '../components/icons.jsx';

// Items without a `section` render in the main list as before. Items sharing
// a `section` value are grouped under an uppercase divider with that label —
// used to keep internal tooling (Operations) visually separate from the
// client-pipeline pages above it.
export const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: HomeIcon },
  { path: '/tasks', label: 'My Tasks', icon: ListChecksIcon, taskView: 'list' },
  { path: '/tasks', label: 'Kanban Board', icon: KanbanIcon, taskView: 'kanban' },
  { path: '/ticketing', label: 'Ticketing', icon: FolderIcon },
  { path: '/prospects', label: 'Students', icon: UsersIcon },
  { path: '/bookings', label: 'Bookings', icon: CalendarIcon },
  { path: '/accounts', label: 'Client Accounts', icon: KeyIcon },
  { path: '/finance', label: 'Payments', icon: WalletIcon },
  { path: '/expenses', label: 'Expenses', icon: ChartBarIcon },
  { path: '/performance', label: 'Performance', icon: TrendingUpIcon },
  { path: '/visa', label: 'Visa', icon: FolderIcon, matchPrefix: true },
  {
    path: '/operations',
    label: 'Operations',
    icon: WrenchIcon,
    matchPrefix: true,
    section: 'Operations',
  },
];

export const PAGE_TITLES = {
  '/ticketing': 'Ticketing',
  '/admin/users': 'Users',
  '/': 'Overview',
  '/tasks': 'Tasks',
  '/prospects': 'Students',
  '/bookings': 'Bookings',
  '/accounts': 'Client Accounts',
  '/finance': 'Payments',
  '/expenses': 'Expenses',
  '/performance': 'Performance',
  '/visa': 'Visa',
  '/visa/classement': 'Visa',
  '/visa/modeles': 'Visa',
  '/operations': 'Operations',
  '/operations/proposal-italy': 'Proposal — Italy',
};
