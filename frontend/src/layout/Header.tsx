import classes from './Header.module.css'
import {Link} from 'react-router-dom'
import { useDispatch } from 'react-redux'
import ArticleSearch from '../components/ArticleSearch'


function Header(){

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
                {/* 搜索框连同它下面那块结果面板整个搬进了 ArticleSearch ——
                    面板必须挂在这个组件里，否则点面板外关闭的判定和
                    .searchContainer 的 z-index 都不好放。 */}
                <ArticleSearch/>
            </div>
        </header>
    )
}
export default Header;