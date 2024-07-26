import classes from './Header.module.css'
import {message, Button} from 'antd'
import {Link} from 'react-router-dom'
import { useDispatch } from 'react-redux'


function Header(){

    function infoMessage(){
        message.warning('still under development')
    }

    const dispatch = useDispatch();

    function showProjectTable(){
        dispatch({
            type:'SHOWPROJECTT',
            payload: ''
        });    
    }
    
    
    return(
        <header className={classes.headerContainer}>
            <div className={classes.headerLeftContainer}>
               
            </div>
            <div className={classes.headerRightContainer}>
                <ul className={classes.navigation}>
                    <li><Link className={classes.link} to={"/"}>Home</Link></li>
                    {/* <li><Link className={classes.link} to={"/resume"}>Resume</Link></li> */}
                    <li><Link className={classes.link} to={"/blog"}>Blog</Link></li>
                    <li><Link onClick={showProjectTable} className={classes.link} to={"/Projects"}>Projects</Link></li>
                    {/* <li onClick={infoMessage}>Project</li> */}
                </ul>
                <div className={classes.searchContainer}>
                    <input type="text" className={classes.searchInput} placeholder="Search..."/>
                    <div onClick={infoMessage} className={classes.searchButton}/>
                </div>
            </div>
        </header>
    )
}
export default Header;