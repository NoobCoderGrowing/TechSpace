import {Article} from "./TypeDefinition";
import './TableEntry.scss';
import { useSelector } from 'react-redux';
import {State} from '../components/TypeDefinition'
import {message} from "antd";

type props = {
    title: string | null,
    display: string | null,
    category: string | null,
    setArticle: Function
}
export default function TableEntry({title, display, category, setArticle}: props){

    const [messageApi, contextHolder] = message.useMessage();
    const articles = useSelector((state : State) => {
        return state.articles;
    })

    function displayArticle(){
        let id = articles[category][title]
        let data = {id: id}
        let jsondata = JSON.stringify(data)
        let url = "http://localhost:7777/public/retrieve/articleByID";
        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: jsondata,
            credentials: 'include'
        }).then(response => response.json()).then(article => {
            setArticle(article);
        })
    }

    function deleteArticle(){
        let id = articles[category][title]
        let data = {id: id}
        let jsondata = JSON.stringify(data)
        let url = "http://localhost:7777/public/delete/articleByID";
        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: jsondata,
            credentials: 'include'
        }).then(response => response.json()).then(article => {
            messageApi.success("article deleted")
        })
    }

    return(
        <div style={{"display":display}} >
            <div className="wrapper">
            <a onClick = {displayArticle}  className="tableEntry"><p>{title}</p></a>
            <a onClick={deleteArticle}>x</a>
            </div>
        </div>
    )
}