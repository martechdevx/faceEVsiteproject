import {Link} from "react-router-dom";

function Verify({isLoggedIn}){
    
    if(!isLoggedIn){
        return(
            <>
                <h1>Please <Link to="/login">Login </Link> First</h1>
                <p>You need to log in before you can verify face</p>
            </>
        );
    }
    
    return(
        <>
            <h1> Verification Page</h1>
            <p><i>Currently working on it...</i></p>
        </>
    );
}

export default Verify