import React, { useState } from "react";
import styles from "./LoginForm.module.css";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiLogin } from "../services/api.js";

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassWord, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data); // saves to localStorage + redirects to /dashboard
    } catch (err) {
      setError("LOGIN FAILED: INVALID EMAIL OR PASSWORD");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.Wrapper}>
      <span>
        <Link to="/" className={styles.iconCloseLogin}><IoClose /></Link>
      </span>
      <div className={`${styles.formBox} ${styles.login}`}>
        <form onSubmit={handleSubmit}>
          <h1>Login</h1>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.inputBox}>
            <input
              type="email" placeholder="Enter Email..." required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <FaEnvelope className={styles.icon} />
          </div>

          <div className={styles.inputBox}>
            <input
              type={showPassWord ? "text" : "password"} 
              id="password" 
              placeholder="Enter Password..." required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <FaLock className={styles.icon} />
          </div>

          <div className={styles.showPassWord}>
            <label>
                <input type="checkbox" 
                    checked={showPassWord}
                    onChange={() => setShowPassword(!showPassWord)}  
            /> Show Password</label>
            <a href="#">Forgot Password?</a>
          </div>

          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className={styles.noAccount}>
            <p>Don't have an account?</p>
            <Link to="/signup">Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;