import classes from './Body.module.css'

function Body(props:any){
    
    return(
        <div className={classes.bodyContainer}>
            {props.children}
        </div>
    )
}
export default Body;