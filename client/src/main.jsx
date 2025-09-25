import React from 'react'; 
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AuthPage from './pages/AuthPage';  // ✅ file gộp cả Login + Register
import AuthSuccess from './pages/AuthSuccess';
import AdminPanel from './pages/AdminPanel';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/auth" element={<AuthPage />} /> {/* ✅ Login + Register */}
      <Route path="/auth-success" element={<AuthSuccess />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  </BrowserRouter>
);
