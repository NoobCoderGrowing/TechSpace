import classes from './ArticleView.module.css'
import { Article } from './TypeDefinition'
import parse from 'html-react-parser'
import elon_zuk from '../assets/elon-musk-mark-zuckerberg.gif'
import 'react-quill/dist/quill.core.css' 
import 'react-quill/dist/quill.bubble.css'
 import 'react-quill/dist/quill.snow.css'

type props = {
    article: Article | undefined
}

export default function ArticleView({article}: props){


    if(article!==null&&article!==undefined){
        return(
            <div className={classes.container}>
                <h1 className={classes.title}>{article.title}</h1>
                <h5 className={classes.date}>{article.date}</h5>
                <div className='ql-editor'>
                    {parse(article.content)}
                </div>
            </div>
        )
    }else{
        return (
            <div className={classes.imageContainer}>
                <img  className={classes.elonzuk} src={elon_zuk} />
            </div>
        )
    }
    
}