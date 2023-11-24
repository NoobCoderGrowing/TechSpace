import classes from "./ContentTable.module.css"
import { useEffect, useState} from "react";
import TableEntry from "./TableEntry";
import {Article} from "./TypeDefinition";
import {Link} from 'react-router-dom'
import { Spin } from 'antd';



type props = {
    setArticle: Function | null
}

export default function ContentTable({setArticle}:props){

    const [data, setData] = useState<Array<Article>>([]);
    const [loading, setLoading] = useState<boolean>(true);

     function retriveArticles(){
         let url = "https://wenjunblog.xyz:7777/public/retrieve/articles";
         fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        }).then(response => response.json()).then(result => {
            setLoading(false);
            setData(result);
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
                    <div className={classes.loadingContainer}>    
                        <Spin spinning={loading} size="large">
                        </Spin>
                    </div>
                    {data.map((article) => <TableEntry key={article._id} setArticle={setArticle} article={article}></TableEntry>)}
                </div>
                <div className={classes.login}><Link to={"/login"}>Write Article</Link></div>
            </div>
        </div>
    )
}