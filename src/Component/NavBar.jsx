import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useState, useEffect } from "react";
import { FiLogOut, FiMenu, FiMoon, FiSun, FiX } from "react-icons/fi";
import styles from "./NavBar.module.css";
import logo from "../assets/logo-white.png"
import { useTheme } from "../context/ThemeContext.jsx";

function NavBar() {
  const { isLoggedIn, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpenPath, setMenuOpenPath] = useState(null);
  const menuOpen = menuOpenPath === location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const publicLinks  = [{ to: "/", label: "Home" }, { to: "/ourblog", label: "Blog" }];
  const privateLinks = [
    { to: "/dashboard",    label: "Dashboard" },
    { to: "/enrollment",   label: "Enrollment" },
    { to: "/verification", label: "Verification" },
    { to: "/ourblog",      label: "Blog" },
  ];
  const links = isLoggedIn ? privateLinks : publicLinks;

  return (
    <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ""} ${menuOpen ? styles.navOpen : ""}`}>
      <Link to="/" className={styles.brand}>
        {/* <div className={styles.logoMark}>
          <FiShield color="white" size={18} />
        </div>
        FaceID<span className={styles.accent}>Pro</span> */}
        {/* Brand */}
          <img src={logo} alt="Logo"></img>
      </Link>

      <button
        type="button"
        className={styles.menuButton}
        onClick={() => setMenuOpenPath(menuOpen ? null : location.pathname)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      <nav className={styles.mobileMenu}>
        <ul className={styles.links}>
          {links.map(l => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`${styles.link} ${location.pathname === l.to ? styles.linkActive : ""}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.themeButton}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
          {theme === "light" ? <FiMoon size={16} /> : <FiSun size={16} />}
        </button>
        {isLoggedIn ? (
          <>
            <div className={styles.userChip}>
              <div className={styles.avatar}>{initials}</div>
              <span>{user?.fullName?.split(" ")[0]}</span>
            </div>
            <button onClick={logout} className={styles.btnGhost}>
              <FiLogOut size={14} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login"  className={styles.btnGhost}>Log In</Link>
            <Link to="/signup" className={styles.btnPrimary}>Get Started</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default NavBar;