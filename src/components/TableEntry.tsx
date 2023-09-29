import {Article} from "./TypeDefinition";
import classes from './TableEntry.module.css';

type props = {
    article: Article | null
    setArticle: Function | null
}
export default function TableEntry({article, setArticle}: props){

    function loadContent(){
        if(setArticle!==null)setArticle(article)
    }

    return(
        <a className={classes.tableEntry} onClick={loadContent}><p>{article?.title}</p></a>
    )
}