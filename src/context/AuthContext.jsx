import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Restore session on page refresh
    const token = localStorage.getItem("token");
    const fullName = localStorage.getItem("full_name");
    const userId = localStorage.getItem("user_id");
    return token ? { token, fullName, userId } : null;
  });

  const navigate = useNavigate();

  function login(data) {
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("full_name", data.full_name);
    localStorage.setItem("user_id", String(data.user_id));
    setUser({ token: data.access_token, fullName: data.full_name, userId: data.user_id });
    navigate("/");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("full_name");
    localStorage.removeItem("user_id");
    setUser(null);
    navigate("/");
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}