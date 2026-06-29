import LoginForm from "../Component/LoginForm.jsx";

function Login({setIsLoggedIn}){
    return (
        <div>
            <LoginForm setIsLoggedIn={setIsLoggedIn}/>
        </div>
    );
}

export default Login