import classes from "./ContentTable.module.css"

export default function ContentTable(props:any){
    return(
        <div className={classes.container}>
            <div className={classes.content}>
                <h1>Table of Content</h1>
                <div className={classes.entryContainer}>
                    <a><p>123</p></a>
                    <a><p>123232323</p></a>
                    {props.children}
                </div>
            </div>
        </div>
    )
}