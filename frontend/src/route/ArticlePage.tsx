import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Spin } from "antd";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import ArticleView from "../components/ArticleView";
import { retrieveArticleById } from "../api/Articles";
import { Article } from "../components/TypeDefinition";
import classes from "./ArticlePage.module.css";


function ArticlePage(){

    // 只取 id。路径里的标题段纯装饰，不参与查询也不做校验：
    // articleMap 是同分类下按标题存的，重名会静默覆盖（标题在库层无唯一约束），
    // 而且标题可改，存下来的标题必然过期。
    const {id} = useParams();
    const [article, setArticle] = useState<Article|undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [notFound, setNotFound] = useState<boolean>(false);

    useEffect(()=>{
        let cancelled = false;
        setLoading(true);
        setNotFound(false);
        setArticle(undefined);
        // 数据路由不做滚动恢复，本项目也没有能挂 <ScrollRestoration/> 的根布局路由，
        // 不手动归零的话，从长列表中间点进来会停在文章中间。
        window.scrollTo(0, 0);

        if(!id){
            setNotFound(true);
            setLoading(false);
            return;
        }

        retrieveArticleById(id)
            .then((result: Article)=>{
                if(cancelled) return;
                if(result && result._id){
                    setArticle(result);
                }else{
                    setNotFound(true);
                }
            })
            .catch(()=>{
                if(!cancelled) setNotFound(true);
            })
            .finally(()=>{
                if(!cancelled) setLoading(false);
            });

        return ()=>{ cancelled = true; };
    },[id])

    // 标签页标题跟着文章走，分享出去的链接至少标题是对的。
    // cleanup 里还原，返回 /blog 时不必再去动 Blog。
    useEffect(()=>{
        document.title = article ? article.title + " | Tech Space" : "Tech Space";
        return ()=>{ document.title = "Tech Space"; };
    },[article])

    return(
        <main>
            <Header/>
            <Body>
                <div className={classes.page}>
                    <div className={classes.backBar}>
                        <Link className={classes.backLink} to="/blog">&larr; Back to blog</Link>
                    </div>
                    {
                        loading
                        ? <div className={classes.statusContainer}><Spin size="large"/></div>
                        : notFound
                            ? <div className={classes.statusContainer}>
                                  <p className={classes.statusText}>Article not found.</p>
                                  <Link className={classes.backLink} to="/blog">Back to blog</Link>
                              </div>
                            // ArticleView 在 article 为 undefined 时会显示那个 GIF 占位图，
                            // 所以只在确定拿到文章的分支渲染它，占位图在独立页上永远不会出现。
                            : <div className={classes.articleWrap}><ArticleView article={article}/></div>
                    }
                </div>
            </Body>
            <Footer/>
        </main>
    )
}
export default ArticlePage;
