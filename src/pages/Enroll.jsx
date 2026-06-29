import {Link} from "react-router-dom";
function Enroll({isLoggedIn}){
    if(!isLoggedIn){
        return(
            <>
                <h1>Please <Link to="/login">Login </Link> First</h1>
                <p> You need an account before you can enroll face</p>
            </>
        );
    }
    
    return(
        <>
            <h1> Enrollment Page</h1>
            <p><i>Currently working on it...</i></p>
        </>
    );
}

export default Enroll