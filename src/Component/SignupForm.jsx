import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiSignup } from "../services/api";
import { FiAlertTriangle, FiCheckCircle, FiEye, FiEyeOff, FiLoader, FiShield, FiPlus, FiZap, FiLock } from "react-icons/fi";
import styles from "./SignupForm.module.css";
import logo from "../assets/logo-white.png"

const SLOTS = [
  { angle:0,   filled:true  },
  { angle:60,  filled:true  },
  { angle:120, filled:true  },
  { angle:180, filled:true  },
  { angle:240, filled:false },
  { angle:300, filled:false },
];
const SLOT_ICONS = [
  <FiShield size={20} color="rgba(96,165,250,0.85)"/>,
  <FiShield size={20} color="rgba(96,165,250,0.85)"/>,
  <FiShield size={20} color="rgba(96,165,250,0.85)"/>,
  <FiShield size={20} color="rgba(96,165,250,0.85)"/>,
];

function OrbitVisual() {
  const R = 118;
  return (
    <div className={styles.orbitContainer}>
      <svg className={styles.orbitRingSvg} viewBox="0 0 290 290">
        <circle cx="145" cy="145" r="118" fill="none"
          stroke="url(#og)" strokeWidth="1.2"
          strokeDasharray="9 7" strokeLinecap="round"/>
        <defs>
          <linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6"/>
            <stop offset="100%" stopColor="#06b6d4"/>
          </linearGradient>
        </defs>
      </svg>

      <div className={styles.orbitCenter}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <ellipse cx="20" cy="22" rx="13" ry="15" stroke="white" strokeWidth="1.5"/>
          <circle cx="14" cy="18" r="2.8" fill="white" opacity="0.92"/>
          <circle cx="26" cy="18" r="2.8" fill="white" opacity="0.92"/>
          <path d="M13 28 Q20 34 27 28" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        </svg>
      </div>

      {SLOTS.map((slot, i) => {
        const rad = (slot.angle * Math.PI) / 180;
        const x = 145 + R * Math.sin(rad);
        const y = 145 - R * Math.cos(rad);
        return (
          <div key={i}
            className={`${styles.orbitSlot} ${slot.filled ? styles.orbitSlotFilled : styles.orbitSlotEmpty}`}
            style={{ left: x - 26, top: y - 26 }}>
            {slot.filled
              ? SLOT_ICONS[i] ?? <FiShield size={20} color="rgba(96,165,250,0.85)"/>
              : <FiPlus size={18} className={styles.slotIcon}/>}
          </div>
        );
      })}

      {[1,2].map(i => (
        <div key={i} className={styles.pulseRing} style={{
          width: 82 + i*44, height: 82 + i*44,
          animationName:"pulse-ring",
          animationDuration:`${1.6 + i*0.6}s`,
          animationTimingFunction:"ease-out",
          animationIterationCount:"infinite",
          animationDelay:`${i*0.45}s`,
        }}/>
      ))}
    </div>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      await apiSignup(fullName, email, password);
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.status === 400
        ? "This email is already registered. Please log in instead."
        : err.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  const filled = [fullName, email, password].filter(Boolean).length;

  const strengthLevel = () => {
    if (!password) return 0;
    if (password.length < 6)  return 1;
    if (password.length < 10) return 2;
    return 3;
  };
  const sl = strengthLevel();
  const barColor = (i) => {
    if (i > sl) return styles.strengthBar;
    return `${styles.strengthBar} ${i === 1 ? styles.strengthWeak : i === 2 ? styles.strengthMid : styles.strengthStrong}`;
  };
  const hintText  = ["", "Weak password", "Moderate", "Strong password ✓"][sl];
  const hintClass = ["", styles.hintWeak, styles.hintMid, styles.hintStrong][sl];

  return (
    <div className={styles.page}>
      {/* ── Left ── */}
      <div className={styles.left}>
        <Link to="/" className={styles.brand}>
          {/* <div className={styles.logoMark}><FiShield color="white" size={18}/></div>
          <span className={styles.brandName}>FaceID<span className={styles.brandAccent}>Pro</span></span> */}
          <img src={logo} alt="Logo"></img>
        </Link>

        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.sub}>
          Already registered? <Link to="/login">Log in</Link>
        </p>

        {/* Progress dots */}
        <div className={styles.progress}>
          {[0,1,2].map(i => (
            <React.Fragment key={i}>
              <div className={`${styles.dot} ${filled > i ? styles.dotDone : filled === i ? styles.dotActive : styles.dotEmpty}`}/>
              {i < 2 && (
                <div className={`${styles.progressLine} ${filled > i ? styles.progressLineDone : styles.progressLineEmpty}`}/>
              )}
            </React.Fragment>
          ))}
          <span className={styles.progressCount}>{filled}/3 fields</span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error   && <div className={styles.alertError}>  <FiAlertTriangle size={14}/> {error}</div>}
          {success && <div className={styles.alertSuccess}><FiCheckCircle size={14}/> {success}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Full name</label>
            <input className={styles.input} type="text" required autoFocus
              placeholder="e.g. Adewale Johnson"
              value={fullName} onChange={e => setFullName(e.target.value)}/>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input className={styles.input} type="email" required
              placeholder="you@university.edu"
              value={email} onChange={e => setEmail(e.target.value)}/>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <input className={`${styles.input} ${styles.inputPadRight}`}
                type={showPw ? "text" : "password"} required
                placeholder="Create a strong password"
                value={password} onChange={e => setPassword(e.target.value)}/>
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(p => !p)}>
                {showPw ? <FiEyeOff size={17}/> : <FiEye size={17}/>}
              </button>
            </div>
            {password && (
              <>
                <div className={styles.strengthBars}>
                  {[1,2,3].map(i => <div key={i} className={barColor(i)}/>)}
                </div>
                <span className={`${styles.strengthHint} ${hintClass}`}>{hintText}</span>
              </>
            )}
          </div>

          {/* <label className={styles.checkLabel}>
            <input type="checkbox" checked={showPw} onChange={() => setShowPw(p => !p)}
              style={{ accentColor:"#3b82f6", width:14, height:14 }}/>
            Show password
          </label> */}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading
              ? <><FiLoader size={15} style={{ animation:"spin-slow 0.8s linear infinite" }}/> Creating account...</>
              : "Create account"}
          </button>

          <p className={styles.terms}>
            By creating an account you agree to the{" "}
            <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>
          </p>
        </form>
      </div>

      {/* ── Right ── */}
      <div className={styles.right}>
        <div className={styles.blob1}/><div className={styles.blob2}/>
        <div className={styles.orbitWrap}><OrbitVisual/></div>
        <div className={styles.caption}>
          <h3 className={styles.captionTitle}>Enroll up to 3 face images</h3>
          <p className={styles.captionText}>
            Multiple angles improve matching accuracy. Each photo is stored as a
            secure vector — no raw images in the database.
          </p>
        </div>
        <div className={styles.pills}>
          {[
            { icon:<FiShield size={12}/>,      text:"School-ready fields" },
            { icon:<FiZap size={12}/>,         text:"Instant enrollment" },
            { icon:<FiLock size={12}/>,        text:"Secure by default" },
          ].map(s => (
            <div key={s.text} className={styles.pill}>{s.icon} {s.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SignUpForm;