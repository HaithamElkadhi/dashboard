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
import ExpensesPage from './pages/ExpensesPage.jsx';
import VisaGuidePage from './pages/visa/VisaGuidePage.jsx';
import VisaClassementPage from './pages/visa/VisaClassementPage.jsx';
import VisaModelesPage from './pages/visa/VisaModelesPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import ProposalItalyPage from './pages/operations/ProposalItalyPage.jsx';

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
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/visa" element={<VisaGuidePage />} />
          <Route path="/visa/classement" element={<VisaClassementPage />} />
          <Route path="/visa/modeles" element={<VisaModelesPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/operations/proposal-italy" element={<ProposalItalyPage />} />
          <Route path="*" element={<ComingSoonPage title="Page introuvable" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
