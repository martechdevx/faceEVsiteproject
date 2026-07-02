import React, { useState } from "react";
import styles from "./SignupForm.module.css";
import { FaUser, FaLock, FaEnvelope, FaEyeSlash } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { apiSignup } from "../services/api";

function SignUpForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassWord, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await apiSignup(fullName, email, password);
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
        if (err.status === 400) {
            setError("This email is already registered. Please log in instead.");
        } else {
            setError(err.message || "Registration failed. Please try again.");
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <span>
        <Link to="/" className={styles.iconCloseSigunp}><IoClose /></Link>
      </span>
      <div className={`${styles.formBox} ${styles.signup}`}>
        <form onSubmit={handleSubmit}>
          <h1>Registration</h1>

          {error && <p className={styles.errorMsg}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <div className={styles.inputBox}>
            <input
              type="text" placeholder="Enter Full Name..." required
              value={fullName} onChange={(e) => setFullName(e.target.value)}
            />
            <FaUser className={styles.icon} />
          </div>

          <div className={styles.inputBox}>
            <input
              type="email" placeholder="Enter Your Email..." required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <FaEnvelope className={styles.icon} />
          </div>

          <div className={styles.inputBox}>
            <input
              type={showPassWord ? "text" : "password"}
              placeholder="Enter Your Password..." required
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
            />
            <FaLock className={styles.icon} />
             {/* <FaEyeSlash className={styles.eye_icon}/> */}
          </div>

          <div className={styles.showPassword}>
            <label>
                <input type="checkbox"  
                    checked={showPassWord}
                    onChange={() => setShowPassword(!showPassWord)}
                /> Show Password</label>
          </div>


          <button className={styles.loginBtn} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>

          <div className={styles.noAccount}>
            <p>Already have an account?</p>
            <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignUpForm;