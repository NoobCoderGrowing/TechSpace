import classes from './BodyRight.module.css'

function BodyRight(props:any){
    return(
        <div className={classes.rightContainer}>
            {props.children}
        </div>
    )
}

export default BodyRight;