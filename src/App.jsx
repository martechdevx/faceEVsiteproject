import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx"
import Login from "./pages/Login.jsx"
import Signup from "./pages/Signup.jsx"
import NavBar from "./Component/NavBar.jsx";
import Enroll from "./pages/Enroll.jsx";
import Verify from "./pages/Verify.jsx";
import Blog from "./pages/Blog.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";

function AppContent({ isLoggedIn, setIsLoggedIn }) {
  const location = useLocation();
  const hideNav = location.pathname === "/dashboard";

  return (
    <>
      {!hideNav && <NavBar />}
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn}/>} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/enrollment" element={<Enroll isLoggedIn={isLoggedIn}/>} />
        <Route path="/verification" element={<Verify isLoggedIn={isLoggedIn}/>} />
        <Route path="/ourblog" element={<Blog/>} />
      </Routes>
    </>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <BrowserRouter>
      <AppContent isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
    </BrowserRouter>
  );
}

export default App
