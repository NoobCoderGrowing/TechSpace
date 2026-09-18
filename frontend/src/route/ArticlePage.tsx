import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Spin } from "antd";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import ArticleView from "../components/ArticleView";
import CommentSection from "../components/CommentSection";
import { retrieveArticleById, reportArticleView } from "../api/Articles";
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

    // 评论区需要文章 id。优先取后端返回的 _id（权威），退到路由段 ——
    // 两者相同，但以文章对象为准不会因为将来路径形态变了就失配。
    const articleId = article?._id || id || '';

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
                    // 浏览量在这里上报，**只在确实取到文章之后** ——
                    // 404 不上报，否则随便谁乱猜 id 都能把计数打上去。
                    //
                    // 用 result._id（后端回来的权威 id）而不是路由段 id，
                    // 和下面 articleId 的取值原则一致。
                    //
                    // 不 await、不放进 then 链：上报失败不该影响阅读，
                    // 所以必须自己接住异常，否则会变成 unhandled rejection。
                    // 依赖数组是 [id]，同一篇文章重复渲染不会重复上报；
                    // 后端那层会话去重是第二道保险（比如 StrictMode 让 effect 双跑）。
                    reportArticleView(result._id).catch(()=>{});
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
                            // 评论区作为 children 传给 ArticleView，由它渲染在
                            // 文章卡下方（同一个浅底滚动容器里）。
                            // 用 article._id 而不是路由里的 id：前者是后端回来的
                            // 权威 id，后者只是路径段。两者相同，但一旦将来路径
                            // 换了形态，以文章对象为准不会错。
                            : <div className={classes.articleWrap}>
                                  <ArticleView article={article}>
                                      {articleId
                                          ? <CommentSection articleId={articleId}/>
                                          : null}
                                  </ArticleView>
                              </div>
                    }
                </div>
            </Body>
            <Footer/>
        </main>
    )
}
export default ArticlePage;
