import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { FaCode, FaLock, FaBook, FaChartLine, FaShieldAlt, FaImage, FaChartBar, FaUserPlus, FaSearch, FaArrowRight } from "react-icons/fa";

/* ── tiny hook: count up to a number ── */
function useCountUp(target, duration = 1600, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return val;
}

/* ── Floating 3-D face scan card ── */
function FaceScanCard() {
  return (
    <div style={{
      position: "relative",
      width: 320,
      height: 380,
      perspective: 1000,
    }}>
      {/* Glow blob */}
      <div style={{
        position: "absolute",
        top: "20%", left: "10%",
        width: "80%", height: "60%",
        background: "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)",
        filter: "blur(40px)",
        animation: "blob 8s ease-in-out infinite",
        borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
      }} />

      {/* Main card */}
      <div style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "var(--scan-card-bg)",
        border: "1px solid var(--border-2)",
        borderRadius: 24,
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        animation: "float 6s ease-in-out infinite",
        boxShadow: "var(--shadow-lg)",
      }}>
        {/* Face scan area */}
        <div style={{
          position: "relative",
          width: 140,
          height: 140,
        }}>
          {/* Rotating ring */}
          <svg style={{
            position: "absolute", inset: -10,
            width: 160, height: 160,
            animation: "spin-slow 8s linear infinite",
            opacity: 0.6,
          }} viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none"
              stroke="url(#ringGrad)" strokeWidth="1.5"
              strokeDasharray="8 6" strokeLinecap="round" />
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>

          {/* Face outline */}
          <div style={{
            width: 140, height: 140,
            border: "2px solid rgba(59,130,246,0.5)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Scan line */}
            <div style={{
              position: "absolute",
              left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg, transparent, #06b6d4, transparent)",
              animation: "scanline 2s linear infinite",
            }} />

            {/* Face SVG */}
            <svg width="70" height="80" viewBox="0 0 70 80" fill="none">
              <ellipse cx="35" cy="38" rx="25" ry="30" stroke="rgba(59,130,246,0.7)" strokeWidth="1.5" />
              <circle cx="26" cy="33" r="4" fill="rgba(59,130,246,0.5)" />
              <circle cx="44" cy="33" r="4" fill="rgba(59,130,246,0.5)" />
              <path d="M25 48 Q35 55 45 48" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" strokeLinecap="round" />
              {/* Dot markers */}
              {[
                [15,18],[55,18],[35,12],[12,40],[58,40],
                [20,58],[50,58],[35,70]
              ].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="2" fill="rgba(6,182,212,0.8)" />
              ))}
            </svg>
          </div>

          {/* Pulse rings */}
          {[1, 2].map(i => (
            <div key={i} style={{
              position: "absolute",
              inset: -20 * i,
              border: "1px solid rgba(37,99,235,0.3)",
              borderRadius: "50%",
              animation: `pulse-ring ${1.8 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }} />
          ))}
        </div>

        {/* Status */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, fontWeight: 600, color: "var(--cyan)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--cyan)",
              boxShadow: "0 0 8px var(--cyan)",
              animation: "glow-pulse 2s ease-in-out infinite",
            }} />
            Scanning...
          </div>
          <div style={{ fontSize: 12, color: "var(--white-30)" }}>
            AI face recognition active
          </div>
        </div>

        {/* Corner brackets */}
        {[
          { top: 12, left: 12, borderTop: 2, borderLeft: 2 },
          { top: 12, right: 12, borderTop: 2, borderRight: 2 },
          { bottom: 12, left: 12, borderBottom: 2, borderLeft: 2 },
          { bottom: 12, right: 12, borderBottom: 2, borderRight: 2 },
        ].map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 20, height: 20,
            borderColor: "var(--cyan)",
            borderStyle: "solid",
            borderWidth: 0,
            ...Object.fromEntries(Object.entries(s).map(([k, v]) =>
              k.startsWith("border") ? [k + "Width", v] : [k, v]
            )),
            ...{ borderColor: "var(--cyan)", borderStyle: "solid" },
            borderTopWidth: s.borderTop || 0,
            borderBottomWidth: s.borderBottom || 0,
            borderLeftWidth: s.borderLeft || 0,
            borderRightWidth: s.borderRight || 0,
            borderRadius: 2,
          }} />
        ))}
      </div>

      {/* Floating badges */}
      <div style={{
        position: "absolute", top: 20, right: -60,
        padding: "8px 14px",
        background: "rgba(16,185,129,0.15)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: 10,
        fontSize: 12, fontWeight: 600,
        color: "#6ee7b7",
        animation: "float2 5s ease-in-out infinite",
        whiteSpace: "nowrap",
      }}>
        ✓ Match Found
      </div>
      <div style={{
        position: "absolute", bottom: 40, left: -70,
        padding: "8px 14px",
        background: "rgba(37,99,235,0.15)",
        border: "1px solid rgba(37,99,235,0.3)",
        borderRadius: 10,
        fontSize: 12, fontWeight: 600,
        color: "#93c5fd",
        animation: "float 7s ease-in-out infinite",
        animationDelay: "1s",
        whiteSpace: "nowrap",
      }}>
        98.4% accuracy
      </div>
    </div>
  );
}

/* ── Stats counter ── */
function StatItem({ value, label, suffix = "", visible }) {
  const count = useCountUp(value, 1600, visible);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: 36, fontWeight: 800,
        fontFamily: "var(--font-display)",
        background: "linear-gradient(135deg, var(--white), var(--cyan))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        lineHeight: 1.1,
        animation: "counter-up 0.5s ease both",
      }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 13, color: "var(--white-60)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ── Feature card ── */
function FeatureCard({ icon, title, desc, delay = 0 }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      padding: "28px 24px",
      background: "var(--card-bg)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      backdropFilter: "blur(16px)",
      transition: "all 0.4s ease",
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(30px)",
      transitionDelay: `${delay}ms`,
      cursor: "default",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)";
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 20px 50px rgba(37,99,235,0.15)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "var(--border)";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
    >
      <div style={{
        width: 48, height: 48,
        background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(6,182,212,0.2))",
        border: "1px solid rgba(37,99,235,0.3)",
        borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, marginBottom: 16,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "var(--white)" }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--white-60)" }}>{desc}</p>
    </div>
  );
}

/* ── How it works step ── */
function Step({ num, title, desc, delay }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      display: "flex", gap: 20, alignItems: "flex-start",
      opacity: vis ? 1 : 0,
      transform: vis ? "translateX(0)" : "translateX(-30px)",
      transition: `all 0.5s ease ${delay}ms`,
    }}>
      <div style={{
        flexShrink: 0,
        width: 44, height: 44,
        background: "linear-gradient(135deg, var(--blue), var(--cyan))",
        borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 16, color: "white",
        fontFamily: "var(--font-display)",
        boxShadow: "var(--shadow-blue)",
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--white)" }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--white-60)", lineHeight: 1.65 }}>{desc}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════ */
function Home() {
  const { isLoggedIn, user } = useAuth();
  const statsRef = useRef(null);
  const [statsVis, setStatsVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVis(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  /* Post-login: redirect immediately to dashboard */
  if (isLoggedIn) {
    return (
      <div style={{
        minHeight: "calc(100vh - var(--nav-h))",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 32, padding: "60px 20px",
        textAlign: "center",
      }}>
        {/* Welcome back hero */}
        <div style={{ animation: "fadeUp 0.6s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 999,
            fontSize: 13, fontWeight: 600, color: "#6ee7b7",
            marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
            Session active
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 5vw, 60px)",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Welcome back,{" "}
            <span style={{
              background: "linear-gradient(135deg, var(--blue-2), var(--cyan))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              {user?.fullName?.split(" ")[0]}
            </span>
          </h1>
          <p style={{ fontSize: 18, color: "var(--white-60)", marginBottom: 40, maxWidth: 500, margin: "0 auto 40px" }}>
            Your face management system is ready. Pick up where you left off.
          </p>
        </div>

        {/* Quick action cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          maxWidth: 800,
          width: "100%",
          animation: "fadeUp 0.7s ease 0.15s both",
        }}>
          {[
            { to: "/dashboard", icon: FaChartBar, title: "Dashboard", desc: "View stats & overview", color: "var(--blue)", glow: "var(--blue-glow)" },
            { to: "/enrollment", icon: FaUserPlus, title: "Enroll", desc: "Register a new person", color: "var(--cyan)", glow: "var(--cyan-glow)" },
            { to: "/verification", icon: FaSearch, title: "Verify", desc: "Match a face against records", color: "var(--green)", glow: "var(--green-glow)" },
          ].map(c => {
            const Icon = c.icon;
            return (
              <Link key={c.to} to={c.to} style={{
                padding: "28px 24px",
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                backdropFilter: "blur(16px)",
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
                transition: "all 0.3s ease",
                textDecoration: "none",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = c.color + "66";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 20px 50px ${c.glow}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}>
                <div style={{ fontSize: 28, color: c.color }}>
                  <Icon size={28} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "var(--white-60)" }}>{c.desc}</div>
                </div>
                <div style={{ fontSize: 12, color: c.color, fontWeight: 600, marginTop: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                  Go <FaArrowRight size={10} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Pre-login landing ── */
  return (
    <div style={{ overflow: "hidden" }}>
      {/* ═══ HERO ═══ */}
      <section style={{
        minHeight: "calc(100vh - var(--nav-h))",
        display: "flex",
        alignItems: "center",
        padding: "80px clamp(24px, 8vw, 120px) 60px",
        gap: 60,
        flexWrap: "wrap",
        justifyContent: "space-between",
      }}>
        {/* Left */}
        <div style={{
          flex: "1 1 480px",
          maxWidth: 580,
          animation: "fadeUp 0.7s ease both",
        }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px",
            background: "rgba(37,99,235,0.12)",
            border: "1px solid rgba(37,99,235,0.3)",
            borderRadius: 999,
            fontSize: 13, fontWeight: 600, color: "var(--blue-2)",
            marginBottom: 28,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "var(--blue-2)",
              boxShadow: "0 0 8px var(--blue)",
            }} />
            AI-Powered Face Recognition
          </div>

          <h1 style={{
            fontSize: "clamp(40px, 5.5vw, 68px)",
            fontWeight: 900,
            fontFamily: "var(--font-display)",
            lineHeight: 1.05,
            letterSpacing: "-1px",
            marginBottom: 24,
          }}>
            Identity that{" "}
            <span style={{
              display: "block",
              background: "linear-gradient(135deg, var(--blue-2) 0%, var(--cyan) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              sees the difference.
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(15px, 1.8vw, 18px)",
            color: "var(--white-60)",
            lineHeight: 1.7,
            marginBottom: 40,
            maxWidth: 480,
          }}>
            FaceIO is a campus-grade face enrollment and verification platform.
            Register students and staff, then verify faces in seconds,
            all secured behind your login.
          </p>

          {/* CTA */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link to="/signup" className="btn btn-primary btn-lg" style={{ gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              Create Account
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Log In →
            </Link>
          </div>

          {/* Trust signals */}
          <div style={{
            marginTop: 40,
            display: "flex", gap: 24, flexWrap: "wrap",
          }}>
            {[
              { icon: "🔒", text: "HMAC-secured API" },
              { icon: "⚡", text: "Sub-second matching" },
              { icon: "🎓", text: "Built for education" },
            ].map(t => (
              <div key={t.text} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, color: "var(--white-60)",
              }}>
                <span>{t.icon}</span>{t.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: 3D card */}
        <div style={{
          flex: "1 1 320px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 80px 40px 40px",
          animation: "fadeUp 0.9s ease 0.15s both",
        }}>
          <FaceScanCard />
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section ref={statsRef} style={{
        padding: "60px clamp(24px, 8vw, 120px)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-around",
          gap: 40,
          flexWrap: "wrap",
        }}>
          <StatItem value={10} suffix="+" label="Faces enrolled" visible={statsVis} />
          <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
          <StatItem value={99} suffix="%" label="Matching accuracy" visible={statsVis} />
          <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
          <StatItem value={1} suffix="s" label="Average match time" visible={statsVis} />
          <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
          <StatItem value={6} label="Images per enrolment" visible={statsVis} />
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: "100px clamp(24px, 8vw, 120px)" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block",
            fontSize: 12, fontWeight: 700, letterSpacing: "2px",
            color: "var(--cyan)",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            PLATFORM CAPABILITIES
          </div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            marginBottom: 16,
          }}>
            Everything you need for{" "}
            <span style={{
              background: "linear-gradient(135deg, var(--blue-2), var(--cyan))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              face-based access
            </span>
          </h2>
          <p style={{ fontSize: 16, color: "var(--white-60)", maxWidth: 500, margin: "0 auto" }}>
            Built specifically for schools, campuses, and institutions that need reliable,
            accurate face recognition without complexity.
          </p>
        </div>

        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 20,
      }}>
        <FeatureCard delay={0}
          icon={<FaCode />}
          title="Multi-Image Enrollment"
          desc="Register up to 3 face images per person for accurate matching across different angles and lighting conditions." />

        <FeatureCard delay={80}
          icon={<FaLock />}
          title="Instant Verification"
          desc="Upload a single photo and match it against enrolled faces in under a second using FAISS vector search." />

        <FeatureCard delay={160}
          icon={<FaChartLine />}
          title="Live Dashboard"
          desc="Real-time stats on total enrollments and verifications. Always know the health and activity of your identity system." />

        <FeatureCard delay={240}
          icon={<FaBook />}
          title="School-Ready Fields"
          desc="Native support for matric numbers, student/staff programs, and gender — tailored to academic institution workflows." />

        <FeatureCard delay={320}
          icon={<FaShieldAlt />}
          title="HMAC-Signed Requests"
          desc="Every API call is cryptographically signed and timestamped. No token leakage, no replay attacks." />

        <FeatureCard delay={400}
          icon={<FaImage />}
          title="Image Quality Checks"
          desc="Client-side pre-validation catches blurry or dark photos before upload, saving you false negatives at verification time." />
      </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{
        padding: "100px clamp(24px, 8vw, 120px)",
        background: "var(--surface-soft)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          display: "flex",
          gap: 80,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <div style={{ flex: "1 1 320px" }}>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "2px",
              color: "var(--cyan)", textTransform: "uppercase", marginBottom: 16,
            }}>
              HOW IT WORKS
            </div>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              marginBottom: 16,
              lineHeight: 1.2,
            }}>
              From registration to verification in 3 steps
            </h2>
            <p style={{ fontSize: 15, color: "var(--white-60)", lineHeight: 1.7 }}>
              Administrators manage the system through a secure login. Faces are enrolled once
              and can be verified any number of times after that.
            </p>
          </div>

          <div style={{
            flex: "1 1 360px",
            display: "flex", flexDirection: "column", gap: 28,
          }}>
            <Step num="1" delay={0}
              title="Create an account & log in"
              desc="Sign up as an administrator. Your session is secured by HttpOnly cookies and HMAC-signed API calls." />
            <Step num="2" delay={100}
              title="Enroll faces with full details"
              desc="Enter the person's name, matric number, program, and upload up to 3 face photos. The system stores a vector embedding — not raw images in a database." />
            <Step num="3" delay={200}
              title="Verify any time"
              desc="Upload a new photo of the same person. The AI compares it against all enrolled vectors and returns the best match with a similarity score." />
          </div>
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section style={{
        padding: "100px clamp(24px, 8vw, 120px)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70%", height: "70%",
          background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontSize: "clamp(28px, 5vw, 56px)",
            fontWeight: 900,
            fontFamily: "var(--font-display)",
            lineHeight: 1.1,
            marginBottom: 20,
          }}>
            Ready to enroll?
          </h2>
          <p style={{
            fontSize: 18, color: "var(--white-60)",
            marginBottom: 40, maxWidth: 480, margin: "0 auto 40px",
          }}>
            Create your admin account and start enrolling faces today. Free to get started.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup" className="btn btn-primary btn-lg">
              Get Started Free
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Already have an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;