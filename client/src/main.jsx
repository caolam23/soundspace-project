import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Register from './pages/Register';
import Login from './pages/Login';
import AuthSuccess from './pages/AuthSuccess';
import AdminPanel from './pages/AdminPanel';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/auth-success" element={<AuthSuccess/>}/>
      <Route path="/admin" element={<AdminPanel/>}/>
    </Routes>
  </BrowserRouter>
);
