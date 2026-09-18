import './TableEntry.scss';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Modal} from "antd";
import { State } from "./TypeDefinition";
import { useState } from "react";
import { MessageInstance } from "antd/es/message/interface";
import { articlePath } from "../lib/articleLink";

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

    // 链接拼法抽到了 lib/articleLink（首页 Top 5 的 Gallery 也要用同一套）。
    // 这里必须用可选链：TableCategory 的 titleDateArray 存在 state 里、只在
    // useEffect 里重算，所以删文章之后会有一帧 articles 已更新而列表项还在，
    // 此时 articles[category][title] 是 undefined，直接取 ['id'] 会在渲染期抛错。
    // 旧代码在点击回调里取值，恰好躲过了这一枪。
    const articleProperties = articles?.[category]?.[title]
    const articleLink = articleProperties
        ? articlePath(articleProperties['id'], title)
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
            {/* 编辑入口，和删除 x 并排、同一个开关。链接用**不可变的 _id** 拼，
                所以改标题不会让这个链接过期（标题段是装饰性的，
                见 lib/articleLink 的注释）。
                这里必须判 articleProperties 是否存在：删除按钮在点击回调里才取
                id，正好躲过了上面说的那一帧竞态；而 href 是渲染期算的，
                不判就会渲染出一个 /edit/undefined。 */}
            {articleProperties &&
                <Link className="edit" to={'/edit/' + articleProperties['id']}
                      style = {{"display":isOwnerLogin?'block':'none'}}><p>✎</p></Link>}
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