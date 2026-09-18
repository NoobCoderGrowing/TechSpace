import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Spin, message } from "antd";
import { retrieveTopArticles } from "../api/Articles";
import { ArticleSummary } from "./TypeDefinition";
import { articlePath } from "../lib/articleLink";
import classes from './Gallery.module.css'


/**
 * 首页的 Top 5 排行榜：按浏览量排序的文章卡片，点击进文章页。
 *
 * 数据不走 redux。这个列表只有这一个消费者，而 articleMap 进 store 是因为
 * 文章目录（Blog 的 ContentTable）和编辑页下拉两处要共享同一份缓存 ——
 * 这里没有第二个消费者，加一个 store 分支只是多一处要同步的状态。
 */
function Gallery(){

    // contextHolder 必须挂在使用 message 的那个组件里。这个组件以前是从 Home
    // 接 messageApi 进来的，现在不接了 —— antd 的 holder 一旦放在父组件、
    // 而 message 在子组件里调，提示会静默不显示（不报错，就是看不到）。
    const [messageApi, contextHolder] = message.useMessage();
    const [articles, setArticles] = useState<ArticleSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(()=>{
        // cancelled 防竞态：离开首页再回来会重新挂载，慢的那个响应回来晚了
        // 不该覆盖新状态，也不该往已卸载的组件上 setState。
        // 这套写法照抄 route/ArticlePage.tsx（全项目最规范的一个数据加载模板）。
        let cancelled = false;
        setLoading(true);

        retrieveTopArticles()
            .then((result)=>{
                if(cancelled) return;
                // 归一化成数组再用：后端 500 时 response.json() 拿到的是
                // Spring 默认错误 JSON（一个对象），直接当列表会在下面的 .map
                // 里抛错，整页白屏。
                setArticles(Array.isArray(result) ? result : []);
            })
            .catch(()=>{
                if(cancelled) return;
                setArticles([]);
                messageApi.error("Failed to load top articles");
            })
            .finally(()=>{
                if(!cancelled) setLoading(false);
            });

        return ()=>{ cancelled = true; };
    },[])

    let content;
    if(loading){
        content = <div className={classes.statusContainer}><Spin size="large"/></div>
    }else if(articles.length === 0){
        // 一篇都没有（或加载失败）时给一句行内文字，而不是渲染一个空盒子：
        // 外层 .galleryContainer 是 absolute + translate 的居中带，
        // 空盒子会在页面中间留个说不出所以然的空洞。
        content = <p className={classes.emptyText}>No articles yet.</p>
    }else{
        content = (
            <div className={classes.gallery}>
                {articles.map((article, index)=>(
                    <Link key={article.id}
                          className={classes.card}
                          to={articlePath(article.id, article.title)}>
                        {/* 序号明写出来，"Top 5" 才看得出是个排行 */}
                        <span className={classes.rank}>{index + 1}</span>
                        <p className={classes.cardTitle}>{article.title}</p>
                        <p className={classes.cardMeta}>{article.category} · {article.date}</p>
                        <p className={classes.cardHits}>{article.hits} views</p>
                    </Link>
                ))}
            </div>
        )
    }

    return(
        <>
            {contextHolder}
            {content}
        </>
    )
};
export default Gallery;
