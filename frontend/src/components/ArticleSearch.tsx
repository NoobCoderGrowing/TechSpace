import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import retriveArticles from "../api/Articles";
import { ArticleMap, State } from "./TypeDefinition";
import { articlePath } from "../lib/articleLink";
import { MAX_RESULTS, searchArticles, splitByRanges, SearchHit, TitleRange } from "../lib/articleSearch";
import classes from "./ArticleSearch.module.css";


/**
 * 校验 response 确实是个 articleMap。
 *
 * 必需：api/Articles 的 retriveArticles 没有 !response.ok 检查（裸的 response.json()），
 * 后端出错时它会把 Spring 的错误 JSON {timestamp,status,error,path} 当成成功结果返回。
 * 不拦的话 dispatch 进去，Object.keys 会把 `timestamp` 当成一个"分类"，
 * 整个 store 被投毒，搜索和 Blog 目录一起烂掉。
 */
function isArticleMap(value: unknown): value is ArticleMap {
    if(!value || typeof value !== 'object' || Array.isArray(value)) return false
    return Object.values(value as Record<string, unknown>).every(
        (entry) => !!entry && typeof entry === 'object' && !Array.isArray(entry)
    )
}


/** 把命中区间渲染成带 <mark> 的片段。 */
function Highlighted({text, ranges}: {text: string, ranges: TitleRange[]}){
    return(
        <>
            {splitByRanges(text, ranges).map((segment, index)=>(
                <span key={index} className={segment.hit ? classes.mark : undefined}>
                    {segment.text}
                </span>
            ))}
        </>
    )
}


function ArticleSearch(){

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const articles = useSelector((state: State) => state.articles);

    // query 是输入框的受控值，term 才是**驱动搜索**的值。
    // 中文输入法组字期间两者会不一致，见 handleChange / handleCompositionEnd。
    const [query, setQuery] = useState<string>('');
    const [term, setTerm] = useState<string>('');
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [closed, setClosed] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [failed, setFailed] = useState<boolean>(false);

    const composingRef = useRef(false);
    const requestedRef = useRef(false);
    const containerRef = useRef<HTMLDivElement|null>(null);
    const inputRef = useRef<HTMLInputElement|null>(null);
    const aliveRef = useRef(true);

    // 每次挂载都要**重新置真**，不能只在 cleanup 里置假：StrictMode 下 effect 是
    // mount → cleanup → mount，只置假的话它永远停在 false，loading 再也回不去，
    // 面板会卡在"加载中…"。（main.tsx 里 StrictMode 目前是注释掉的，但随时可能打开。）
    useEffect(()=>{
        aliveRef.current = true;
        return ()=>{ aliveRef.current = false };
    },[])

    // 本地过滤一个几十条的数组是零成本，不做防抖 —— 防抖只会凭空增加延迟，
    // 还要引入全站第一个 setTimeout。useMemo 挡掉无关重渲染时的重算就够了。
    const hits = useMemo(()=>searchArticles(articles, term),[articles, term])
    const visible = hits.slice(0, MAX_RESULTS);
    const open = !closed && term.trim() !== '';

    /**
     * 懒加载 articleMap。**放在聚焦时而不是挂载时**：挂载时拉的话每个路由都会多发一次
     * 请求，而且在 /blog 上会和 ContentTable 自己的那次重复。
     * 已经有数据（比如刚在 /blog 上加载过）就直接用，搜索是瞬时的。
     */
    function ensureData(){
        if(requestedRef.current || Object.keys(articles).length > 0) return;
        requestedRef.current = true;
        setLoading(true);
        setFailed(false);
        retriveArticles()
            .then((result: unknown)=>{
                if(isArticleMap(result)){
                    dispatch({type:'UPDATEARTICLES', payload: result});
                }else{
                    fail();
                }
            })
            // response.json() 在非 JSON 响应上会抛；这个 promise 没人接就是
            // unhandled rejection，所以必须自己兜住。
            .catch(()=>fail())
            .finally(()=>{ if(aliveRef.current) setLoading(false) });
    }

    /**
     * 拉数据失败。除了标记失败，还要**把 requestedRef 放回去**，让下次聚焦能重试 ——
     * 否则后端重启前的这一次失败会把这辈子的搜索能力一起锁掉（只差一次页面刷新），
     * 而"聚焦重试"不会比聚焦本身更频繁，刷不出请求风暴。
     */
    function fail(){
        if(!aliveRef.current) return;
        requestedRef.current = false;
        setFailed(true);
    }

    /** 换词元。三个入口（输入、上屏、清空）都要做同样三件事，收在一处。 */
    function applyTerm(next: string){
        setTerm(next);
        setActiveIndex(0);
        setClosed(false);
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>){
        const next = event.target.value;
        // 受控值每个 change 都必须跟手，否则组字期间会把字吞掉。
        setQuery(next);
        // 但组字期间**不能**驱动搜索：此时的 next 是还没上屏的拼音串
        // （输入"检索"的过程中会依次变成 j / ji / jia / jian / jiansuo…），
        // 拿它去搜会让面板为这串拼音乱闪。
        if(!composingRef.current) applyTerm(next);
    }

    function handleCompositionStart(){
        composingRef.current = true;
    }

    function handleCompositionEnd(event: React.CompositionEvent<HTMLInputElement>){
        composingRef.current = false;
        // 上屏后再把最终串交给搜索。（随后的 onChange 也走一遍 applyTerm，
        // 值相同，收敛到同一状态。）
        applyTerm(event.currentTarget.value);
    }

    function openHit(hit: SearchHit | undefined){
        // 先关面板再跳。跳到自己正在看的那篇文章时路由不变、Header 不重挂载，
        // 不显式关的话面板会一直开着。
        setClosed(true);
        if(hit) navigate(articlePath(hit.id, hit.title));
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>){
        // ★ 组字期的 Enter 是"选词上屏"，不是"打开第一条"。不拦的话
        // 拼音打到一半按 Enter 选词，会被当成确认搜索直接跳走。
        // isComposing 是现代标准；composingRef 兜底。
        if(event.nativeEvent.isComposing || composingRef.current) return;

        if(event.key === 'Escape'){
            // 只关面板：输入框内容和焦点都留着，用户可以接着改。
            setClosed(true);
            return;
        }

        if(!open || visible.length === 0){
            // 没有结果时 Enter 什么也不做，但不能让它有别的默认行为。
            if(event.key === 'Enter') event.preventDefault();
            return;
        }

        if(event.key === 'ArrowDown'){
            event.preventDefault();   // 否则光标会跳到输入框末尾
            setActiveIndex((index) => (index + 1) % visible.length);
        }else if(event.key === 'ArrowUp'){
            event.preventDefault();
            setActiveIndex((index) => (index - 1 + visible.length) % visible.length);
        }else if(event.key === 'Enter'){
            event.preventDefault();
            openHit(visible[activeIndex]);
        }
    }

    function handleButtonClick(){
        // 给这个图标按钮一个真实用途（原来是弹"still under development"）：
        // 有结果就打开高亮的那条，没有就把焦点放回输入框。
        if(open && visible.length > 0){
            openHit(visible[activeIndex]);
        }else{
            inputRef.current?.focus();
            ensureData();
        }
    }

    // 点面板外关闭。这是全站第一个 document 级监听 —— cleanup 是必须的，
    // 少了它每开一次面板就多一个常驻监听（而且旧监听闭包里握着会 setState 的引用）。
    useEffect(()=>{
        if(!open) return;
        function handleMouseDown(event: MouseEvent){
            if(!containerRef.current?.contains(event.target as Node)){
                setClosed(true);
            }
        }
        document.addEventListener('mousedown', handleMouseDown);
        return ()=>document.removeEventListener('mousedown', handleMouseDown);
    },[open])

    let panelBody;
    if(visible.length > 0){
        panelBody = (
            <>
                {visible.map((hit, index)=>(
                    <Link
                    key={hit.id}
                    to={articlePath(hit.id, hit.title)}
                    className={index === activeIndex ? classes.itemActive : classes.item}
                    onMouseEnter={()=>setActiveIndex(index)}
                    onClick={()=>setClosed(true)}
                    role="option"
                    aria-selected={index === activeIndex}
                    >
                        <span className={classes.itemTitle}>
                            <Highlighted text={hit.title} ranges={hit.titleRanges}/>
                        </span>
                        <span className={classes.itemMeta}>
                            <Highlighted text={hit.category} ranges={hit.categoryRanges}/> · {hit.date}
                        </span>
                    </Link>
                ))}
                {
                    // 没有结果页，所以匹配很多时唯一诚实的做法是提示细化关键词。
                    hits.length > MAX_RESULTS
                    ? <p className={classes.more}>共 {hits.length} 条匹配，请细化关键词</p>
                    : null
                }
            </>
        )
    }else if(failed){
        // 不能把"加载失败"显示成"没找到"。
        panelBody = <p className={classes.status}>搜索暂不可用</p>
    }else if(loading){
        // 同理：数据还在路上时不能说"没有匹配的文章"。
        panelBody = <p className={classes.status}>加载中…</p>
    }else{
        panelBody = <p className={classes.status}>没有匹配的文章</p>
    }

    return(
        <div className={classes.searchContainer} ref={containerRef}>
            <input
            ref={inputRef}
            type="text"
            className={classes.searchInput}
            placeholder="Search..."
            value={query}
            onChange={handleChange}
            onFocus={ensureData}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            role="combobox"
            aria-expanded={open}
            aria-controls="article-search-panel"
            autoComplete="off"
            />
            <div onClick={handleButtonClick} className={classes.searchButton}/>
            {
                open
                ? <div id="article-search-panel" role="listbox" className={classes.panel}>{panelBody}</div>
                : null
            }
        </div>
    )
}
export default ArticleSearch;
