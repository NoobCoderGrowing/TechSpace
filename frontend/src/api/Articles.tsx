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

export default retriveArticles;