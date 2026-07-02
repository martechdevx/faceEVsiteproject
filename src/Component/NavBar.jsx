import { Link } from "react-router-dom";
import logo from "../assets/logo-black.png";
import { useAuth } from "../context/AuthContext.jsx";

function NavBar() {
  const { isLoggedIn, logout, user } = useAuth();

  return (
    <header className="navigation-container">
      <Link to="/"><img src={logo} alt="Logo" className="logo" /></Link>

      <div className="navigation-menu">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/enrollment">Enrollment</Link>
        <Link to="/verification">Verification</Link>
        <Link to="/ourblog">Our Blog</Link>
      </div>

      <div className="navigation-btn">
        {isLoggedIn ? (
          <>
            <span className="nav-username">Hi, {user.fullName.split(" ")[0]}</span>
            <button type="button" onClick={logout} className="navlogin nav-logout">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navlogin"><button type="button">Login</button></Link>
            <Link to="/signup" className="navlogin"><button type="button">SignUp</button></Link>
          </>
        )}
      </div>
    </header>
  );
}

export default NavBar;