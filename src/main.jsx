import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import HomePage from './pages/HomePage.jsx';
import ProspectsPage from './pages/ProspectsPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import FinancePage from './pages/FinancePage.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/prospects" element={<ProspectsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/finance" element={<FinancePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
