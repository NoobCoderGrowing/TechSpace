import {Article} from "./TypeDefinition";
import './TableCategory.scss';
import TableEntry from "./TableEntry";
import { useState } from "react";

type props = {
    articles: Object | null
    category: string | null
    setArticle: Function
}
export default function TableCategory({articles, category, setArticle}: props){

    const[display, setDisplay] = useState<string>('none');
    
    function toggelContent(){
        if(display == 'none'){
            setDisplay('block')
        }else{
            setDisplay('none')
        }
    }

    return(
        <div className='categoryContainer'>
            <a className='category' onClick={toggelContent}><p>{category}</p></a>
            {Object.keys(articles).map((title)=><TableEntry key={title} setArticle={setArticle} category={category} display = {display} title={title} ></TableEntry>)}  
        </div>
    )
}