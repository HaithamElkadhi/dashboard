// Single source of truth for the sidebar's nav items and the header's page
// titles, so both stay in sync as pages are added.
import {
  CalendarIcon,
  ChartBarIcon,
  FolderIcon,
  HomeIcon,
  KanbanIcon,
  ListChecksIcon,
  TeamIcon,
  UsersIcon,
  WalletIcon,
} from '../components/icons.jsx';

export const NAV_ITEMS = [
  { path: '/', label: 'Vue d’ensemble', icon: HomeIcon },
  { path: '/tasks', label: 'Mes tâches', icon: ListChecksIcon, taskView: 'list' },
  { path: '/tasks', label: 'Tableau Kanban', icon: KanbanIcon, taskView: 'kanban' },
  { path: '/calendar', label: 'Calendrier', icon: CalendarIcon },
  { path: '/prospects', label: 'Étudiants / Prospects', icon: UsersIcon },
  { path: '/documents', label: 'Documents', icon: FolderIcon, comingSoon: true },
  { path: '/finance', label: 'Paiements', icon: WalletIcon },
  { path: '/reports', label: 'Rapports', icon: ChartBarIcon },
  { path: '/team', label: 'Équipe', icon: TeamIcon },
];

export const PAGE_TITLES = {
  '/': 'Vue d’ensemble',
  '/tasks': 'Tâches',
  '/calendar': 'Calendrier',
  '/prospects': 'Étudiants / Prospects',
  '/documents': 'Documents',
  '/finance': 'Paiements',
  '/reports': 'Rapports',
  '/team': 'Équipe',
  '/settings': 'Paramètres',
};
