import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiLogin } from "../services/api.js";
import {
  FiAlertTriangle, FiEye, FiEyeOff, FiLoader,
  FiShield, FiLock, FiCheckCircle, FiClock, FiUser,
} from "react-icons/fi";
import styles from "./LoginForm.module.css";
import logo from "../assets/logo-white.png"

function FaceOrb() {
  return (
    <div className={styles.orbContainer}>
      {[0,1,2].map(i => (
        <div key={i} className={styles.pulseRing} style={{
          inset: -(i * 24),
          animationName: "pulse-ring",
          animationDuration: `${2.2 + i * 0.7}s`,
          animationTimingFunction: "ease-out",
          animationIterationCount: "infinite",
          animationDelay: `${i * 0.45}s`,
        }}/>
      ))}
      <div className={styles.orbMain}>
        <div className={styles.scanLine}/>
        <svg className={styles.orbRing} viewBox="0 0 194 194">
          <circle cx="97" cy="97" r="90" fill="none"
            stroke="url(#lg1)" strokeWidth="1"
            strokeDasharray="10 8" strokeLinecap="round"/>
          <defs>
            <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6"/>
              <stop offset="100%" stopColor="#06b6d4"/>
            </linearGradient>
          </defs>
        </svg>
        <svg width="115" height="128" viewBox="0 0 115 128" fill="none">
          <ellipse cx="57" cy="64" rx="40" ry="48" stroke="rgba(147,197,253,0.75)" strokeWidth="1.5"/>
          <ellipse cx="43" cy="55" rx="7" ry="8" fill="rgba(96,165,250,0.55)"/>
          <ellipse cx="71" cy="55" rx="7" ry="8" fill="rgba(96,165,250,0.55)"/>
          <circle cx="43" cy="55" r="3.5" fill="rgba(255,255,255,0.95)"/>
          <circle cx="71" cy="55" r="3.5" fill="rgba(255,255,255,0.95)"/>
          <path d="M53 69 L57 76 L61 69" stroke="rgba(147,197,253,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M43 87 Q57 97 71 87" stroke="rgba(147,197,253,0.7)" strokeWidth="2" strokeLinecap="round" fill="none"/>
          {[[18,26],[96,26],[57,14],[10,64],[104,64],[27,100],[87,100],[57,112],[31,40],[83,40]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="2.8" fill="rgba(96,165,250,0.9)"/>
          ))}
          {[32,52,68,88].map(y=>(
            <line key={y} x1="18" y1={y} x2="96" y2={y} stroke="rgba(96,165,250,0.07)" strokeWidth="0.6"/>
          ))}
          {[22,40,57,74,92].map(x=>(
            <line key={x} x1={x} y1="15" x2={x} y2="112" stroke="rgba(96,165,250,0.07)" strokeWidth="0.6"/>
          ))}
        </svg>
        <div className={`${styles.bracket} ${styles.bracketTL}`}/>
        <div className={`${styles.bracket} ${styles.bracketTR}`}/>
        <div className={`${styles.bracket} ${styles.bracketBL}`}/>
        <div className={`${styles.bracket} ${styles.bracketBR}`}/>
      </div>
    </div>
  );
}

function MatchCard({ name }) {
  return (
    <div className={styles.matchCard}>
      <div className={styles.matchAvatar}>
        <FiShield size={18} color="rgba(96,165,250,0.9)"/>
      </div>
      <div>
        <div className={styles.matchName}>{name}</div>
        <div className={styles.matchMeta}>
          <span className={styles.matchBadge}><FiCheckCircle size={9}/> Verified</span>
          <span className={styles.matchTime}><FiClock size={9}/> 1s</span>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await apiLogin(email, password, adminMode);
      login(data);
    } catch (err) {
      setError(err.message || "Invalid email or passowrd. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Left ── */}
      <div className={styles.left}>
        <Link to="/" className={styles.brand}>
          {/* <div className={styles.logoMark}><FiShield color="white" size={18}/></div>
          <span className={styles.brandName}>FaceID<span className={styles.brandAccent}>Pro</span></span> */}
          <img src={logo} alt="Logo"></img>
        </Link>

        <h1 className={styles.heading}>{adminMode ? "Admin sign in" : "Welcome back"}</h1>
        <p className={styles.sub}>
          New here? <Link to="/signup">Create account</Link>
        </p>

        <div className={styles.authMode} role="group" aria-label="Sign-in type">
          <button type="button" className={`${styles.modeButton} ${!adminMode ? styles.modeActive : ""}`} aria-pressed={!adminMode} onClick={() => { setAdminMode(false); setError(""); }}>
            <FiUser size={15}/> User login
          </button>
          <button type="button" className={`${styles.modeButton} ${adminMode ? styles.modeActive : ""}`} aria-pressed={adminMode} onClick={() => { setAdminMode(true); setError(""); }}>
            <FiShield size={15}/> Admin login
          </button>
        </div>
        {adminMode && <p className={styles.adminNote}>Use your authorized admin account.</p>}

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.error}>
              <FiAlertTriangle size={14}/> {error}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input
              className={styles.input}
              type="email" required autoFocus
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <input
                className={`${styles.input} ${styles.inputPadRight}`}
                type={showPw ? "text" : "password"}
                required placeholder="Your password"
                value={password} onChange={e => setPassword(e.target.value)}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(p => !p)}>
                {showPw ? <FiEyeOff size={17}/> : <FiEye size={17}/>}
              </button>
            </div>
            <div className={styles.forgotRow}>
              <a href="#" className={styles.forgotLink}>Forgot password?</a>
            </div>
          </div>

          {/* <label className={styles.checkLabel}>
            <input type="checkbox" checked={showPw} onChange={() => setShowPw(p => !p)}
              style={{ accentColor:"#3b82f6", width:14, height:14 }}/>
            Show password
          </label> */}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? <><FiLoader size={15} style={{ animation:"spin-slow 0.8s linear infinite" }}/> Logging in...</> : "Log in"}
          </button>

          {/* <div className={styles.divider}>
            <div className={styles.dividerLine}/>
            <span className={styles.dividerText}>or continue with</span>
            <div className={styles.dividerLine}/>
          </div>

          {[
            { icon: <FiLock size={15}/>, label: "Use single sign-on (SSO)" },
            { icon: <FiShield size={15}/>, label: "Sign in with your institution" },
          ].map(btn => (
            <button key={btn.label} type="button" className={styles.ssoBtn}>
              {btn.icon} {btn.label}
            </button>
          ))} */}
        </form>
      </div>

      {/* ── Right ── */}
      <div className={styles.right}>
        <div className={styles.blob1}/>
        <div className={styles.blob2}/>
        <div className={styles.orbWrap}>
          <MatchCard name="Adewale Johnson" />
          <MatchCard name="Fatima Bello" />
          <FaceOrb/>
        </div>
        <div className={styles.accuracyBadge}>
          <div className={styles.dot}/>
          <span className={styles.accuracyText}>AI face recognition — 99.2% accuracy</span>
        </div>
        <div className={styles.pills}>
          {[
            { icon: <FiShield size={12}/>, text: "5,000+ faces enrolled" },
            { icon: <FiCheckCircle size={12}/>, text: "Sub-second matching" },
            { icon: <FiLock size={12}/>, text: "HMAC-secured API" },
          ].map(s => (
            <div key={s.text} className={styles.pill}>{s.icon} {s.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginForm;