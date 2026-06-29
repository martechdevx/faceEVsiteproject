import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import styles from "./SignupForm.module.css"
import {FaUser, FaLock, FaEnvelope} from "react-icons/fa";
import { IoClose } from "react-icons/io5";

function SignUpForm(){

    const[fullName, setFullName] = useState('');
    const[email, setEmail] = useState('');
    const[password, setPassword] = useState('');

    const handleSignupDetails = (e) => {
        e.preventDefault();

        console.log(`Fullname: ${fullName}`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

        setEmail('')
        setFullName('')
        setPassword('')
    }

    return (
        <div className={styles.wrapper}>
            <span >
                <Link to="/" className={styles.iconCloseSigunp}><IoClose/> </Link>
            </span>
            <div className={ `${styles.formBox} ${styles.signup}`}>
                <form onSubmit={handleSignupDetails}>
                    <h1> Registration</h1>
                    <div className={styles.inputBox}>
                        <input type="text" 
                         placeholder="Enter Full Name.." required
                         value={fullName}
                         onChange={(e) => setFullName(e.target.value)}
                         /> 
                        <FaUser className={styles.icon}/>
                    </div>
                        
                    <div className={styles.inputBox}>
                        <input type="email" 
                         placeholder="Enter Your Email..."
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         />
                        <FaEnvelope  className={styles.icon}/>
                    </div>
                    <div className={styles.inputBox}>
                        <input type="password" 
                         placeholder="Enter Your Password..."
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         />
                        <FaLock  className={styles.icon}/>
                    </div>

                    <div className={styles.rememberForgot}>
                        <label> 
                            <input type="checkbox" /> I agree to the terms & conditions
                        </label>
                    </div>
                    <button className={styles.loginBtn} type="submit">Register</button>
                    <div className={styles.noAccount}>
                        <p>Already have an account? </p>
                        <Link to="/login">Login </Link>
                    </div>
                </form>
            </div>
                
        </div>
    );
}

export default SignUpForm