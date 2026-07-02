import { useAuth } from "../context/AuthContext.jsx";
import styles from "../pages/enrollment/Enroll.module.css";
import { Link } from "react-router-dom";

function Home() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className={styles.gateWrap}>
        <div className={styles.gateBox}>
          <h2>FACE ENROLLMENT WEBSITE</h2>
          <p>You need to login to have access to the full functionality.</p>
          <Link to="/login" className={styles.gateBtn}>Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-card" style={{ margin: "24px 0 40px" }}>
      <h1 className="page-title">Welcome to your face enrollment dashboard</h1>
      <p className="page-subtitle">
        Manage enrollments, verify faces, and stay in control of your system from one place.
      </p>
    </div>
  );
}

export default Home