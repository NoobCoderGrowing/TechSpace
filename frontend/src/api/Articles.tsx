import { ArticleSummary } from "../components/TypeDefinition";

function retriveArticles(){

    const baseURL:string = import.meta.env.VITE_BASE_URL
    let url = baseURL + "public/retrieve/articleMap"

    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    }).then(response => response.json()).then(result=>{
        return result;
    });
}

// 按 _id 取整篇文章（含 content）。文章永久链接页用它。
export function retrieveArticleById(id: string){

    const baseURL:string = import.meta.env.VITE_BASE_URL
    let url = baseURL + "public/retrieve/articleByID"

    return fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id: id}),
        credentials: 'include'
    }).then(response => {
        // 这个状态检查是必需的：后端 retrieveArticleByID 是裸的
        // articleRepository.findById(id).get()，且项目里没有任何 @ControllerAdvice，
        // 所以 id 不存在时会抛 NoSuchElementException -> HTTP 500 +
        // Spring 默认错误 JSON（一个没有 title/content 的对象）。
        // 不拦的话就会把那个错误对象当成文章渲染。
        if(!response.ok){
            throw new Error("retrieveArticleById failed: " + response.status)
        }
        return response.json();
    });
}

/**
 * 首页 Top 5 的文章列表。
 *
 * 这个接口**不回 content**（只回 id/title/date/category/hits），但状态码检查
 * 一样不能省 —— 项目没有 @ControllerAdvice，500 时 `response.json()` 拿到的是
 * Spring 默认错误 JSON，直接当列表用会在渲染期炸在 `.map` 上。
 *
 * 不传 credentials：和 retriveArticles 一样是纯公开读，不需要分辨身份。
 */
export function retrieveTopArticles(): Promise<ArticleSummary[]>{

    const baseURL:string = import.meta.env.VITE_BASE_URL
    let url = baseURL + "public/retrieve/topArticles"

    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    }).then(response => {
        if(!response.ok){
            throw new Error("retrieveTopArticles failed: " + response.status)
        }
        return response.json();
    });
}

/**
 * 上报一次浏览。
 *
 * **credentials 必须传。** 后端的去重是记在**会话**里的，而前端 (:5173) 和后端
 * (:7777) 是跨源部署 —— fetch 默认的 credentials 是 "same-origin"，不带这个选项
 * 就不会发会话 cookie，后端每次都认成新访客，去重彻底失效：
 * 表现是每刷新一次浏览量就 +1，而服务端日志一切正常。
 *
 * 这个调用是 fire-and-forget 的，**调用方必须自己 .catch()**，
 * 否则一个网络抖动会变成 unhandled rejection。
 */
export function reportArticleView(id: string){

    const baseURL:string = import.meta.env.VITE_BASE_URL
    let url = baseURL + "public/report/articleView"

    return fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id: id}),
        credentials: 'include'
    }).then(response => {
        if(!response.ok){
            throw new Error("reportArticleView failed: " + response.status)
        }
        return response.json();
    });
}

export default retriveArticles;
