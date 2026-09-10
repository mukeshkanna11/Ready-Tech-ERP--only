import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from '../App.jsx';
import Login from '../pages/auth/Login.jsx';

// Placeholder only — the Dashboard UI is not implemented yet.
const DashboardPlaceholder = () => <div style={{ padding: 24 }}>Dashboard</div>;

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<DashboardPlaceholder />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
