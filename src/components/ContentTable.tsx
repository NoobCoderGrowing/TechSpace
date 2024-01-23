import classes from "./ContentTable.module.css"
import { useEffect, useState} from "react";
import {Link} from 'react-router-dom'
import { Spin, message } from 'antd';
import TableCategory from "./TableCategory";
import { useDispatch, useSelector } from 'react-redux'
import retriveArticles from "../api/Articles";
import {State} from '../components/TypeDefinition'






type props = {
    setArticle: Function | null
}

export default function ContentTable({setArticle}:props){

    const [loading, setLoading] = useState<boolean>(true);
    const [messageApi, contextHolder] = message.useMessage();
    const dispatch = useDispatch();

    const data = useSelector((state: State)=> state.articles); 

    function getArticleMap(){
        retriveArticles().then(result=>{
            setLoading(false);
            dispatch({
                type:'UPDATEARTICLES',
                payload: result
            });
        })
    }

    useEffect(()=>{
        getArticleMap();
    },[])

    return(
        <div className={classes.container}>
            {contextHolder}
            <div className={classes.content}>
                <h1 className={classes.header}>Table of Content</h1>
                <div className={classes.entryContainer}>
                    <div className={classes.loadingContainer}>    
                        <Spin spinning={loading} size="large">
                        </Spin>
                    </div>
                    
                    {
                        Object.keys(data).map(key=>
                         <TableCategory messageApi={messageApi} updateArticleMap={getArticleMap} setArticle={setArticle} key={key} articles={data[key]} category={key}></TableCategory>
                        )
                    }
                    
                </div>
                <div className={classes.login}><Link to={"/login"}>Write Article</Link></div>
            </div>
        </div>
    )
}