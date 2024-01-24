import {Article} from "./TypeDefinition";
import './TableCategory.scss';
import TableEntry from "./TableEntry";
import { useEffect, useState } from "react";
import { MessageInstance } from "antd/es/message/interface";

type props = {
    titleArticles: Object | null,
    category: string | null,
    setArticle: Function,
    updateArticleMap: Function,
    messageApi: MessageInstance

}
export default function TableCategory({messageApi, titleArticles, category, setArticle, updateArticleMap}: props){

    const[display, setDisplay] = useState<string>('none');
    const[titleDateArray, setTitleDataArray] = useState([]);
  
    function toggelContent(){
        if(display == 'none'){
            setDisplay('block')
        }else{
            setDisplay('none')
        }
    }

    function sortTitleArticles(){
        let array = [];
        Object.keys(titleArticles).map(title =>{
            let titleDate = []
            titleDate.push(title)
            titleDate.push(titleArticles[title]['date'])
            array.push(titleDate);
        })
        array.sort((a,b)=>{
            return new Date(a[1]).valueOf() - new Date(b[1]).valueOf();
        })
        setTitleDataArray(array);
    }

    useEffect(()=>sortTitleArticles(),[titleArticles])

    return(
        <div className='categoryContainer'>
            <a className='category' onClick={toggelContent}><p>{category}</p></a>
            {titleDateArray.map((titleDate)=><TableEntry messageApi={messageApi} updateArticleMap={updateArticleMap} key={titleDate[0]} setArticle={setArticle} category={category} display = {display} title={titleDate[0]} ></TableEntry>)}  
        </div>
    )
}