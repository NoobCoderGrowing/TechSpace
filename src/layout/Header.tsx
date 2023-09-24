import classes from './Header.module.css'
import {message} from 'antd'
import {Link} from 'react-router-dom'

function Header(){

    function infoMessage(){
        message.warning('still under development')
    }

    return(
        <header className={classes.headerContainer}>
            <div className={classes.headerLeftContainer}>

            </div>
            <div className={classes.headerRightContainer}>
                <ul className={classes.navigation}>
                    <li><Link className={classes.link} to={"/"}>Home</Link></li>
                    <li><Link className={classes.link} to={"/Resume"}>Resume</Link></li>
                    <li onClick={infoMessage}>Blog</li>
                    <li onClick={infoMessage}>Project</li>
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