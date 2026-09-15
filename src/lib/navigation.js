// Single source of truth for the sidebar's nav items and the header's page
// titles, so both stay in sync as pages are added.
import {
  ChartBarIcon,
  FolderIcon,
  HomeIcon,
  KanbanIcon,
  KeyIcon,
  ListChecksIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
} from '../components/icons.jsx';

// Items without a `section` render in the main list as before. Items sharing
// a `section` value are grouped under an uppercase divider with that label —
// used to keep internal tooling (Operations) visually separate from the
// client-pipeline pages above it.
export const NAV_ITEMS = [
  { path: '/', label: 'Vue d’ensemble', icon: HomeIcon },
  { path: '/tasks', label: 'Mes tâches', icon: ListChecksIcon, taskView: 'list' },
  { path: '/tasks', label: 'Tableau Kanban', icon: KanbanIcon, taskView: 'kanban' },
  { path: '/prospects', label: 'Étudiants / Prospects', icon: UsersIcon },
  { path: '/accounts', label: 'Comptes clients', icon: KeyIcon },
  { path: '/finance', label: 'Paiements', icon: WalletIcon },
  { path: '/expenses', label: 'Expenses', icon: ChartBarIcon },
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
  '/': 'Vue d’ensemble',
  '/tasks': 'Tâches',
  '/prospects': 'Étudiants / Prospects',
  '/accounts': 'Comptes clients',
  '/finance': 'Paiements',
  '/expenses': 'Expenses',
  '/visa': 'Visa',
  '/visa/classement': 'Visa',
  '/visa/modeles': 'Visa',
  '/operations': 'Operations',
  '/operations/proposal-italy': 'Proposal — Italy',
};
