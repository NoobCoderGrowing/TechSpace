export type Article = {
    _id: string,
    title: string,
    date: string,
    content: string,
    category: string
}

/**
 * 文章在列表里的形态（首页 Top 5 用）。
 *
 * 和 Article 的关键差别：**没有 content**（后端不回整篇正文，见 ArticleSummary），
 * 且 id 字段叫 `id` 而不是 `_id` —— 后端那个 record 的分量名就是 id，
 * Jackson 直接按分量名序列化。两种形状并存，别混。
 */
export type ArticleSummary = {
    id: string,
    title: string,
    date: string,
    category: string,
    hits: number
}

/**
 * articleMap 的叶子。后端只往里放 id 和 date 两个键（见 ArticleService 里那段
 * articlePropertiesMap），**没有 content、没有 hits，也没有 category** ——
 * 分类是外层 map 的 key，叶子自己不知道自己属于哪一类。
 */
export type ArticleLeaf = {
    id: string,
    date: string
}

/**
 * `GET /public/retrieve/articleMap` 的返回形态，也是 store 里 state.articles 的形状：
 * 分类 -> 标题 -> {id, date}。
 *
 * 这里的 key 是**标题**而不是 id —— 重名会静默覆盖（标题在库层没有唯一约束），
 * 这是既有设计，用的时候心里有数。
 */
export type ArticleMap = Record<string, Record<string, ArticleLeaf>>

export type LoginState = {
    ownerLogin: boolean;
}

export type LikesState = {
    homeLikes: number;
}

export type VisibleState = {
    projectTableV: boolean;
}

export type State = {
    // 原来是 Object —— 只靠 strict:false + noImplicitAny:false 混过去，
    // 实际给不了任何帮助，而且 Object **不能**当 Record 用（没有索引签名），
    // 搜索那边接不上。消费方（TableEntry / TableCategory / EidtPage）读的都是
    // 同一套嵌套，换上来之后类型才对得上。
    articles: ArticleMap,
    login: LoginState
    likes: LikesState
}




