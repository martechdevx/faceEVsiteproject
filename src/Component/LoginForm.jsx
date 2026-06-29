import React, { useState, useEffect } from "react";
import styles from "./LoginForm.module.css";
import {FaUser, FaLock, FaXRay, FaEnvelope} from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import {Link} from "react-router-dom";

function LoginForm({setIsLoggedIn}){

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLoginDetails = (e) => {
        e.preventDefault();

        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        setEmail('')
        setPassword('')

        setIsLoggedIn(true);
        console.log("User is Logged in");
        localStorage.setItem("isLoggrdIn", "true");
    }
    return (
        <div className={styles.Wrapper}>
            <span >
                <Link to="/" className={styles.iconCloseLogin}><IoClose/> </Link>
            </span>
            <div className={ `${styles.formBox} ${styles.login}`}>
                <form onSubmit={handleLoginDetails}>
                    <h1> Login</h1>
                    <div className={styles.inputBox}>
                        <input type="email"
                         placeholder="Enter Email..." required
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                        /> 
                        <FaEnvelope className={styles.icon}/>
                    </div>
                        
                    <div className={styles.inputBox}>
                        <input type="password" 
                         placeholder="Enter Passowrd..."
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                        />
                        <FaLock  className={styles.icon}/>
                    </div>

                    <div className={styles.rememberForgot}>
                        <label> 
                            <input type="checkbox" /> Remember me
                        </label>
                        <a href="#">Forgot Password? </a>
                    </div>
                    <button type="submit" className={styles.loginBtn}>Login</button>
                    <div className={styles.noAccount}>
                        <p>Don't have an account? </p>
                        <Link to="/signup">Register </Link>
                    </div>
                </form>
            </div>
                
        </div>
    );
}

export default LoginForm