import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/Login.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Company from "./pages/company/Company.jsx";
import Branches from "./pages/company/Branches.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import { getToken } from "./services/api";
import Users from "./pages/users/Users.jsx";
function ProtectedRoute({ children }) {
  const token = getToken();

  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Protected app shell: persistent sidebar + main content */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard is the default home page after login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/company" element={<Company />} />
        <Route path="/company/branches" element={<Branches />} />
        <Route path="/users" element={<Users />} />
      </Route>

      {/* Invalid route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
