import classes from "./ContentTable.module.css"
import { useEffect, useState} from "react";
import TableEntry from "./TableEntry";
import {Article} from "./TypeDefinition";
import {Link} from 'react-router-dom'



type props = {
    setArticle: Function | null
}

export default function ContentTable({setArticle}:props){

    const [data, setData] = useState<Array<Article>>([]);

     function retriveArticles(){
         let url = "http://localhost:7777/public/retrieve/articles";
         fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        }).then(response => response.json()).then(result => {
            setData(result)
        })
    }
    useEffect(()=>{
        retriveArticles();
    },[])
    return(
        <div className={classes.container}>
            <div className={classes.content}>
                <h1 className={classes.header}>Table of Content</h1>
                <div className={classes.entryContainer}>
                    {data.map((article) => <TableEntry setArticle={setArticle} article={article}></TableEntry>)}
                </div>
                <a className={classes.login}><Link to={"/login"}>Write Article</Link></a>
            </div>
        </div>
    )
}