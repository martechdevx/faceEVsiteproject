import React, { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import { useAuth } from "../../context/AuthContext";
import { apiDashboardStats } from "../../services/api";
import logo from "../../assets/logo-black.png"

const Dashboard = () => {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_enrolled: 0, total_verified: 0 });
  const [loading, setLoading] = useState(true);

    if (!isLoggedIn) {
      return(
        <div className={styles.gateWrap}>
          <div className={styles.gateBox}>
            <h2>Access Restricted</h2>
            <p>You need to be logged in to see dashboard a face.</p>
            <Link to="/login" className={styles.gateBtn}>Go to Login</Link>
          </div>
        </div>
      );
    }
	useEffect(() => {
		apiDashboardStats()
		.then((data) => setStats(data))
		.catch(() => {})
		.finally(() => setLoading(false));
	}, [isLoggedIn]);

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <Link to="/"> <img src={logo} alt="logo" className={styles.sidebarLogo}/></Link>
        <nav className={styles.sidebarNav}>
          <Link to="/dashboard" className={`${styles.navItem} ${styles.active}`}>📊 Dashboard</Link>
          <Link to="/enrollment" className={styles.navItem}>🧑 Enrollment</Link>
          <Link to="/verification" className={styles.navItem}>🔍 Verification</Link>
          <Link to="/ourblog" className={styles.navItem}>📝 Blog</Link>
        </nav>
        <button className={styles.logoutBtn} onClick={logout}>⬅ Logout</button>
      </aside>
        <div className={styles.clear}> </div>
      {/* ── Main Content ── */}
      <main className={styles.main}>
        <div className={styles.clear}> </div>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>Overview of face enrollments and verification activity</p>
          </div>
          <div className={styles.userBadge}>
            👤 {user?.fullName}
          </div>
          
        </header>
        <section className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Enrolled Faces</div>
            <div className={styles.cardBody}>
              <span className={styles.large}>
                {loading ? "..." : stats.total_enrolled.toLocaleString()}
              </span>
              <span className={styles.muted}>Registered in the system</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Total Verifications Performed</div>
            <div className={styles.cardBody}>
              <span className={styles.large}>
                {loading ? "..." : stats.total_verified.toLocaleString()}
              </span>
              <span className={styles.muted}>Verifications done so far</span>
            </div>
          </div>

          <div className={styles.quickAccess}>
            <div className={styles.qaHeader}>Quick Access</div>
            <div className={styles.qaButtons}>
              <Link to="/enrollment" className={styles.buttonPrimary}>Enroll Face</Link>
              <Link to="/verification" className={styles.buttonOutline}>Verify Face</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;