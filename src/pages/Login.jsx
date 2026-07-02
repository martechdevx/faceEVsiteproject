import LoginForm from "../Component/LoginForm.jsx";

function Login({ setIsLoggedIn }) {
  return (
    <div className="page-centered">
      <LoginForm setIsLoggedIn={setIsLoggedIn} />
    </div>
  );
}

export default Login