import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import AppShell from './components/layout/AppShell.jsx';
import ComingSoonPage from './components/layout/ComingSoonPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProspectsPage from './pages/ProspectsPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import { FolderIcon } from './components/icons.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/prospects" element={<ProspectsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route
            path="/documents"
            element={
              <ComingSoonPage
                icon={FolderIcon}
                title="Documents"
                description="La gestion documentaire centralisée arrive bientôt."
              />
            }
          />
          {/* Reports, Calendrier, Équipe and Paramètres ship next — this
              catch-all keeps the sidebar's links to them from 404ing. */}
          <Route
            path="*"
            element={
              <ComingSoonPage title="Bientôt disponible" />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
