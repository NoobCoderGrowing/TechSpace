import './TableEntry.scss';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Modal} from "antd";
import { State } from "./TypeDefinition";
import { useState } from "react";
import { MessageInstance } from "antd/es/message/interface";

type props = {
    title: string | null,
    display: string | null,
    category: string | null,
    updateArticleMap: Function,
    messageApi: MessageInstance
}
export default function TableEntry({messageApi, title, display, category, updateArticleMap}: props){
    const articles = useSelector((state: State) => state.articles)
    const isOwnerLogin = useSelector((state: State) => state.login.ownerLogin)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);

    // 逐段编码，不能对拼好的整串做（那会把分隔符 / 也编成 %2F）。
    // 标题里的中文、#、?、/ 都靠它兜住。
    // 这里必须用可选链：TableCategory 的 titleDateArray 存在 state 里、只在
    // useEffect 里重算，所以删文章之后会有一帧 articles 已更新而列表项还在，
    // 此时 articles[category][title] 是 undefined，直接取 ['id'] 会在渲染期抛错。
    // 旧代码在点击回调里取值，恰好躲过了这一枪。
    const articleProperties = articles?.[category]?.[title]
    const articleLink = articleProperties
        ? "/blog/" + encodeURIComponent(articleProperties['id']) + "/" + encodeURIComponent(title)
        : "/blog"

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
            <Link to={articleLink} className="tableEntry"><p>{title}</p></Link>
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