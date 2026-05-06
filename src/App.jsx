import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Game from "./pages/Game.jsx";
import Wallet from "./pages/Wallet.jsx";
import Withdraw from "./pages/Withdraw.jsx";
import Profile from "./pages/Profile.jsx";
import Activity from "./pages/Activity.jsx";

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-shell card">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <Private>
            <Home />
          </Private>
        }
      />
      <Route
        path="/game/wingo"
        element={
          <Private>
            <Game />
          </Private>
        }
      />
      <Route
        path="/game/ludo"
        element={
          <Private>
            <Navigate to="/game/wingo" replace />
          </Private>
        }
      />
      <Route
        path="/game/aviator"
        element={
          <Private>
            <Navigate to="/game/wingo" replace />
          </Private>
        }
      />
      <Route
        path="/game"
        element={
          <Private>
            <Navigate to="/game/wingo" replace />
          </Private>
        }
      />
      <Route
        path="/activity"
        element={
          <Private>
            <Activity />
          </Private>
        }
      />
      <Route
        path="/wallet"
        element={
          <Private>
            <Wallet />
          </Private>
        }
      />
      <Route
        path="/withdraw"
        element={
          <Private>
            <Withdraw />
          </Private>
        }
      />
      <Route path="/deposit" element={<Private><Navigate to="/wallet" replace /></Private>} />
      <Route path="/deposit/history" element={<Private><Navigate to="/wallet" replace /></Private>} />
      <Route
        path="/profile"
        element={
          <Private>
            <Profile />
          </Private>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
