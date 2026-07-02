import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import NavBar from "./Component/NavBar.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Enroll from "./pages/enrollment/Enroll.jsx";
import Verify from "./pages/verification/Verify.jsx";
import Blog from "./pages/Blog.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";

function AppContent() {
  // const location = useLocation();
  // const hideNav = location.pathname === "/dashboard";

  return (
    <>
      <NavBar />
      <div className="page-shell">
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;