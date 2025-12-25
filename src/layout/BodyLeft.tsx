import classes from './BodyLeft.module.css'

function BodyLeft(props:any){
    return(
        <div className={classes.leftContainer}>
            {props.children}
        </div>
    )
}

export default BodyLeft;