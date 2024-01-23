import classes from "./ContentTable.module.css"
import { useEffect, useState} from "react";
import {Article} from "./TypeDefinition";
import {Link} from 'react-router-dom'
import { Spin } from 'antd';
import TableCategory from "./TableCategory";
import { useDispatch } from 'react-redux'




type props = {
    setArticle: Function | null
}

export default function ContentTable({setArticle}:props){

    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<Object>({});
    const dispatch = useDispatch();

     async function retriveArticleMap(){
        let url = "http://localhost:7777/public/retrieve/articleMap";
        //  let url = "https://wenjunblog.xyz:7777/public/retrieve/articles";
        await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        }).then(response => response.json()).then(result => {
            setData(result);
            setLoading(false);
            dispatch({
                type:'UPDATEARTICLES',
                payload: result
            });
        })
    }
    useEffect(()=>{
        retriveArticleMap();
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
                    
                    {
                        Object.keys(data).map(key=>
                         <TableCategory setArticle={setArticle} key={key} articles={data[key]} category={key}></TableCategory>
                        )
                    }
                    
                </div>
                <div className={classes.login}><Link to={"/login"}>Write Article</Link></div>
            </div>
        </div>
    )
}