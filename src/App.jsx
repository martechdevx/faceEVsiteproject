import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import NavBar from "./Component/NavBar.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Enroll from "./pages/enrollment/Enroll.jsx";
import Verify from "./pages/verification/Verify.jsx";
import Blog from "./pages/Blog.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";

function AppContent() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const adminDashboard = isAdmin && location.pathname === "/dashboard";

  return (
    <>
      {!adminDashboard && <NavBar />}
      <div className={adminDashboard ? "page-shell page-shell-admin" : "page-shell"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/enrollment" element={<Enroll />} />
          <Route path="/verification" element={<Verify />} />
          <Route path="/ourblog" element={<Blog />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;