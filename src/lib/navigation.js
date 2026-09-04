// Single source of truth for the sidebar's nav items and the header's page
// titles, so both stay in sync as pages are added.
import {
  FolderIcon,
  HomeIcon,
  KanbanIcon,
  KeyIcon,
  ListChecksIcon,
  UsersIcon,
  WalletIcon,
} from '../components/icons.jsx';

export const NAV_ITEMS = [
  { path: '/', label: 'Vue d’ensemble', icon: HomeIcon },
  { path: '/tasks', label: 'Mes tâches', icon: ListChecksIcon, taskView: 'list' },
  { path: '/tasks', label: 'Tableau Kanban', icon: KanbanIcon, taskView: 'kanban' },
  { path: '/prospects', label: 'Étudiants / Prospects', icon: UsersIcon },
  { path: '/accounts', label: 'Comptes clients', icon: KeyIcon },
  { path: '/finance', label: 'Paiements', icon: WalletIcon },
  { path: '/visa', label: 'Visa', icon: FolderIcon, matchPrefix: true },
];

export const PAGE_TITLES = {
  '/': 'Vue d’ensemble',
  '/tasks': 'Tâches',
  '/prospects': 'Étudiants / Prospects',
  '/accounts': 'Comptes clients',
  '/finance': 'Paiements',
  '/visa': 'Visa',
  '/visa/classement': 'Visa',
  '/visa/modeles': 'Visa',
};
