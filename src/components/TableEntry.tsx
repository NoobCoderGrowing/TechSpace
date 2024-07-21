import './TableEntry.scss';
import { useSelector } from 'react-redux';
import { Button, Modal} from "antd";
import { State } from "./TypeDefinition";
import { useState } from "react";
import { MessageInstance } from "antd/es/message/interface";

type props = {
    title: string | null,
    display: string | null,
    category: string | null,
    setArticle: Function,
    updateArticleMap: Function,
    messageApi: MessageInstance
}
export default function TableEntry({messageApi, title, display, category, setArticle, updateArticleMap}: props){
    const articles = useSelector((state: State) => state.articles)
    const isOwnerLogin = useSelector((state: State) => state.login.ownerLogin)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);


    function displayArticle(){
        let id = articles[category][title]['id']
        let data = {id: id}
        let jsondata = JSON.stringify(data)
        let url = "https://wenjunblog.xyz:7777/public/retrieve/articleByID";
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

    function openModal(){
        setIsModalOpen(true)
    }

    function closeModal(){
        setIsModalOpen(false)
    }

    function deleateArticle(){
        let id = articles[category][title]['id']
        let data = {id: id}
        let jsondata = JSON.stringify(data)
        const baseURL:string = import.meta.env.VITE_BASE_URL
        let url = baseURL + "admin/delete/articleByID"  


        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: jsondata,
            credentials: 'include'
        }).then(response => response.json()).then(result => {
            updateArticleMap();
            console.log(result);
            messageApi.success("article deleted");
        })
    }

    
    return(
        <div style={{"display":display}} >
            <div className="wrapper">
            <a onClick = {displayArticle}  className="tableEntry"><p>{title}</p></a>
            <a className="deletion" style = {{"display":isOwnerLogin?'block':'none'}} onClick={openModal}><p>x</p></a>
            </div>
            <Modal
            open={isModalOpen}
            title="Warning"
            onOk={deleateArticle}
            onCancel={closeModal}
            footer={ [
            <Button key="yes" type="primary" loading={loading} onClick={deleateArticle}>
                Yes
            </Button>,
            <Button
                loading={loading}
                onClick={closeModal}
            >
                Cancel
            </Button>,
            ]}
                >
                <p>Are you sure to delete the article &nbsp; <span className="deleteTitle">{title}</span></p>
            </Modal>
           
        </div>
    )
}