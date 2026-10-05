import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import AppShell from './components/layout/AppShell.jsx';
import ComingSoonPage from './components/layout/ComingSoonPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProspectsPage from './pages/ProspectsPage.jsx';
import TicketingPage from './pages/TicketingPage.jsx';
import StudentDocumentsPage from './pages/StudentDocumentsPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import FinanceDocumentPage from './pages/FinanceDocumentPage.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import PerformancePage from './pages/PerformancePage.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import VisaGuidePage from './pages/visa/VisaGuidePage.jsx';
import VisaClassementPage from './pages/visa/VisaClassementPage.jsx';
import VisaModelesPage from './pages/visa/VisaModelesPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import ProposalItalyPage from './pages/operations/ProposalItalyPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';

// Production only: keep the worker away from Vite's development server.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .catch((error) => console.warn('PWA registration failed:', error));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/prospects" element={<ProspectsPage />} />
          <Route path="/students/:studentId/documents" element={<StudentDocumentsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/ticketing" element={<TicketingPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/finance/paiements/:paiementId/document" element={<FinanceDocumentPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/visa" element={<VisaGuidePage />} />
          <Route path="/visa/classement" element={<VisaClassementPage />} />
          <Route path="/visa/modeles" element={<VisaModelesPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/operations/proposal-italy" element={<ProposalItalyPage />} />
          <Route path="*" element={<ComingSoonPage title="Page introuvable" />} />
        </Route>
      </Routes></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
