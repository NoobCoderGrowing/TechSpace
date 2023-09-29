import classes from './ArticleView.module.css'
import { Article } from './TypeDefinition'
import parse from 'html-react-parser';

type props = {
    article: Article | undefined
}

export default function ArticleView({article}: props){


    if(article!==null&&article!==undefined){
        return(
            <div className={classes.container}>
                <h1 className={classes.title}>{article.title}</h1>
                <h5 className={classes.date}>{article.date}</h5>
                {parse(article.content)}
            </div>
        )
    }else{
        return (
            <div className={classes.container}>
                <h1 className={classes.title}>Welcome to Wayne's Tech Space</h1>
            </div>
        )
    }
    
}