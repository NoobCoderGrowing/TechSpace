import classes from '../ArticleView.module.css'
import elon_zuk from '../../assets/elon-musk-mark-zuckerberg.gif'

export default function ProjectsDefault(){
    return (
        <div className={classes.imageContainer}>
            <img  className={classes.elonzuk} src={elon_zuk} />
        </div>
    )
}