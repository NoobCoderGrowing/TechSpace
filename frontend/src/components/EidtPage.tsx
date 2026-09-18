import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyRight from "../layout/BodyRight";
import TextEditor from "./TextEditor";
import { ChangeEvent, KeyboardEventHandler, useEffect, useState } from "react";
import classes from './EidtPage.module.css'
import type { MenuProps } from 'antd';
import { Button, message, Spin} from "antd";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from 'moment';
import './EditPageAdditional.css'
import { useDispatch, useSelector } from 'react-redux';
import {Article, State} from '../components/TypeDefinition'
import retriveArticles, { retrieveArticleById } from "../api/Articles";
import { useNavigate, useParams } from "react-router-dom";
import { articlePath } from "../lib/articleLink";



/**
 * 把库里存的 "YYYY-MM-DD" 字符串转成 DatePicker 要的 Date。
 *
 * **不能用 `new Date(date)`**：那按 UTC 午夜解析，在东八区以外的负时区
 * （比如美西）会显示成**前一天**，用户一存就把日期改错了。
 * moment 按本地时区解析，显示的就是存的那个日期。
 *
 * 解析不出来时退回今天，只影响下拉框里显示的那个值 —— `date` 这个 state
 * 存的是原样字符串，用户不碰日期选择器就不会被写回去。
 * （正常数据不会走到这一步：date 在库里按 ISO-8601 定长字符串存。）
 */
function parseStoredDate(value: string | undefined): Date {
    const parsed = moment(value, "YYYY-MM-DD");
    return parsed.isValid() ? parsed.toDate() : new Date();
}

export default function EidtPage(){

    // 有 id 就是编辑已有文章，没有就是新建。两条路由共用这个组件
    // （/edit 和 /edit/:id，见 main.tsx）。
    const {id} = useParams();
    const navigate = useNavigate();

    const [messageApi, contextHolder] = message.useMessage();
    const [editorValue, setEditorValue] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [category, setCategory] = useState<string>('category');
    const [startDate, setStartDate] = useState(new Date());
    const [display, setDisplay] = useState<string>('none');
    const [inputDisplay, setInputDisplay] = useState<string>('none');

    // 初值直接跟 id 走，而不是等 effect 里再置 true：effect 在首次渲染**之后**
    // 才跑，那样编辑模式下会先渲染一次空编辑器（TextEditor 的 content 只在挂载时
    // 读一次，那次挂载读了空串，白挂一次）。
    const [loading, setLoading] = useState<boolean>(!!id);
    const [notFound, setNotFound] = useState<boolean>(false);

    const dispatch = useDispatch();

    function toggleDisplay(){
        if(display=='none'){
            if(inputDisplay == 'block'){
                setInputDisplay('none')
            }
            setDisplay('block');
        }else{
            setDisplay('none');
        }
    }

    function toggleInputDisplay(){
        if(inputDisplay=='none'){
            setInputDisplay('block');
        }else{
            setInputDisplay('none');
        }
    }

    function closeAll(){
        setDisplay('none');
        setInputDisplay('none')
    }

    async function getArticleMap(){
        await retriveArticles().then(result=>{
            dispatch({
                type:'UPDATEARTICLES',
                payload: result
            });
        })
    }

    // 左栏的 ContentTable 移掉了，而它原本是这个页面唯一拉文章目录的地方
    // （分类下拉框读的是 redux 里的 state.articles）。不在这里补一次，
    // 下拉框就只剩占位文字 "category"，已有分类一个都选不到。
    // 上传成功后的刷新仍由 uploadArticle 里的 getArticleMap() 负责。
    useEffect(()=>{
        getArticleMap();
    },[])

    /**
     * 编辑模式：把要改的那篇捞回来填进表单。
     *
     * 每一轮的字段**必须重置**。`/edit/a` → `/edit/b` 是同一个路由、只换了参数，
     * React 不会卸载组件 —— 不重置的话表单里还是 A 的值，点保存就把 B 覆盖成 A 了
     * （请求失败时更糟：表单里是 A 的内容，看着像是 B 的内容加载出来了）。
     */
    useEffect(()=>{
        let cancelled = false;

        setTitle('');
        setEditorValue('');
        setDate('');
        setCategory('category');
        setStartDate(new Date());
        setNotFound(false);
        closeAll();

        if(!id){
            // 新建模式。这里什么都不拉，编辑器直接可用。
            setLoading(false);
            return;
        }

        setLoading(true);
        retrieveArticleById(id)
            .then((result: Article)=>{
                if(cancelled) return;
                if(result && result._id){
                    setTitle(result.title ?? '');
                    // date 存的是原样字符串（提交时直接发回去），startDate 才是给
                    // 日期选择器看的 Date，两者分开正是为了避免上面说的时区偏移。
                    setDate(result.date ?? '');
                    setStartDate(parseStoredDate(result.date));
                    setCategory(result.category ?? 'category');
                    setEditorValue(result.content ?? '');
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

    function uploadArticle(){
        if(title=='' || editorValue=='' || category == '' || category == 'category'|| date == ''){
            messageApi.error("some fields are empty")
            return;
        }
        const baseURL:string = import.meta.env.VITE_BASE_URL
        let url = baseURL + "admin/upload/article"  
        let data = {title: title, date: date, content: editorValue, category: category}
        let jsondata = JSON.stringify(data)
        
        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: jsondata,
            credentials: 'include'
        }).then(response => response.json()).then(result=>{
            if(result['uploaded']==true){
                getArticleMap();
                messageApi.success("Upload successful")
            }else{
                messageApi.error("Unauthorized upload or duplicate article")
            }
        })
    }

    /**
     * 保存对已有文章的修改。字段和新建页完全一致（标题/日期/分类/正文）。
     */
    function updateArticle(){
        if(title=='' || editorValue=='' || category == '' || category == 'category'|| date == ''){
            messageApi.error("some fields are empty")
            return;
        }
        const baseURL:string = import.meta.env.VITE_BASE_URL
        let url = baseURL + "admin/update/article"
        let data = {id: id, title: title, date: date, content: editorValue, category: category}
        let jsondata = JSON.stringify(data)

        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: jsondata,
            credentials: 'include'
        // 这里**不能用 response.json()**：/admin/** 走安全过滤器链，没登录时
        // EntryPointHandler 回的是 HTTP 200 + 一个裸字符串
        // 'Full authentication is required to access this resource'（实测过），
        // 根本不是 JSON —— response.json() 会直接抛 SyntaxError。
        // 那样一来"会话过期"会落进下面的 catch 被报成"请求失败"，
        // 和网络断连混成一种；更糟的是如果只看 response.ok，它会被当成保存成功。
        // 所以先拿文本再自己解析。
        }).then(response => response.text()).then((text)=>{
            let payload: any = undefined;
            try{
                payload = JSON.parse(text);
            }catch{
                // 不是 JSON：会话过期（上面那个裸字符串），或者后端 500 的
                // Spring 默认错误页。两种都不该显示成"保存成功"。
                payload = undefined;
            }
            if(payload?.updated === true){
                // 目录缓存（redux 里的 state.articles）要立刻刷：改的正是
                // (分类, 标题) 这两个键，不刷的话左栏还是旧标题旧分类。
                // 后端那边也已经重建了（updateArticle 的 finally 里调 hourlyUpdate）。
                getArticleMap();
                messageApi.success("Saved");
                // 编辑和新建不一样：改完跳到文章页看效果最直观。
                // 用不可变的 id 拼链接，标题段只是装饰（见 lib/articleLink）。
                navigate(articlePath(id as string, title));
            }else if(payload?.reason){
                messageApi.error(reasonMessage(payload.reason))
            }else{
                messageApi.error("Not authorized - please log in again")
            }
        }).catch(()=>{
            // 网络层失败（连不上、被中断）也要有反馈，否则点了保存什么都不会发生。
            messageApi.error("Save failed: request failed")
        })
    }

    /**
     * 服务端给的失败原因 → 人话。后端 updateArticle 回的是
     * {"updated":false,"reason":"empty"|"not_found"|"duplicate"}。
     *
     * 区分这几种是为了能指导下一步动作：重名是**可操作**的（换个标题），
     * 而旧的 upload 接口只回一个 {"uploaded":false}，把"没权限"和"重名"
     * 混成一句 "Unauthorized upload or duplicate article"，用户不知道该改什么。
     */
    function reasonMessage(reason: string | undefined): string {
        switch(reason){
            case 'duplicate':
                return "This category already has an article with that title"
            case 'not_found':
                return "Article not found - it may have been deleted"
            case 'empty':
                return "some fields are empty"
            default:
                // 没有 reason 多半是根本没进到方法里（会话过期，被安全链拦下），
                // 那种响应体是别的形状。
                return "Unauthorized update or save failed"
        }
    }

    function handleTitleInput(e:ChangeEvent<HTMLInputElement>){
        setTitle(e.target.value);
    }

    function datePickerHandler(pickedDate: Date){
        const formatedDate = moment(pickedDate, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DD"); 
        setDate(formatedDate);
        setStartDate(pickedDate);
    }

    function handleCategory(e){
        toggleDisplay();
        setCategory(e.target.innerText)
    }

    const articleCategories = useSelector((state : State) => {
        return Object.keys(state.articles);
    })

    function createCategory(){
            toggleDisplay();
            toggleInputDisplay();
    }

    const  handelCreateCategory = (e:React.KeyboardEvent<HTMLInputElement>) => {
        if(e.keyCode==13){
            setCategory((e.target as HTMLInputElement).value);
            toggleInputDisplay();
            (e.target as HTMLInputElement).value ='';
        }
    }

    const  handelCreateCategoryChange = (e:React.ChangeEvent<HTMLInputElement>) => {
        setCategory(e.target.value);   
    }
    
   
    return(
        <main> 
            <Header/>
            <Body>
                {/* 只有 BodyRight。Body 是 flex row，BodyRight 带 flex-grow:1，
                    所以它会自动从 80vw 撑满整行，不需要改任何 CSS。 */}
                <BodyRight>
                    <div>
                        <div className={classes.titleDateContainer}>
                            <div className={classes.titleDateWrapper}>
                                <div className={classes.categoryContainer}>
                                    <button className={classes.categoryDisplay} onClick={toggleDisplay}>{category}</button>
                                    <div className={classes.dropDown}>
                                        <div className={classes.dropDownItemWrapper}>
                                            {articleCategories.map((category)=><a style={{'display':display}} onClick={handleCategory} className={classes.dropDownItem}> {category}</a>)}
                                            <button style={{'display':display}} onClick={createCategory} className={classes.createButton}> create category</button>
                                        </div>
                                        <input onChange={handelCreateCategoryChange} onKeyUp={handelCreateCategory} style={{'display':inputDisplay}}className={classes.categoryInput}></input>
                                    </div>
                                </div>
                                <div className={classes.titleContainer}>
                                    <label className={classes.title}>Title</label>
                                    {/* value 绑上：这原本是全页唯一非受控的控件
                                        （分类按钮、日期选择器都是受控的），
                                        不绑的话编辑模式下标题框永远是空的，
                                        一保存就把原标题清掉了。 */}
                                    <input className={classes.titleInput} value={title} onChange={handleTitleInput}></input>
                                </div>
                                <div className={classes.dateSubmitContainer}>
                                    <div className={classes.dateContainer}>
                                        <label className={classes.dateLabel}>Date</label>
                                        <DatePicker dateFormat="yyyy-MM-dd" selected={startDate} onChange={datePickerHandler} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* 编辑模式要等数据到了再挂编辑器。TextEditor 里的
                            useEditor({content: editorValue}) 只在**挂载时**读一次
                            content（那边的注释写着），先挂一个空的再把值塞进去是
                            塞不进去的 —— 现象是"标题分类都回填了，正文是空的"。
                            key 则保证 /edit/a → /edit/b 时是重新挂载而不是复用
                            上一个编辑器实例（同一个路由只换参数，组件不卸载）。 */}
                        <div onClick={closeAll}>
                            {loading
                                ? <div style={{'display':'flex', 'justifyContent':'center', 'padding':'3rem'}}><Spin/></div>
                                // 取不到就**不要**渲染编辑器：那样会给出一个空表单，
                                // 填完点保存只会被后端回一句 not_found。
                                : notFound
                                    ? <p style={{'marginTop':'1rem'}}>
                                          Article not found. It may have been deleted, or the link is wrong.
                                      </p>
                                    : <TextEditor key={id ?? 'create'} editorValue={editorValue} setEditorValue={setEditorValue}/>}
                        </div>
                    </div>
                    {/* 固定在视口右下角。祖先链上没有任何 transform/filter/will-change，
                        所以这里的 position:fixed 就是相对视口，滚动时不动，也不会被
                        BodyRight 的 overflow-x 裁掉。
                        contextHolder 必须跟着按钮走 —— antd 的 message context 得挂在
                        能渲染到的地方，uploadArticle 里的 messageApi 才会生效。 */}
                    <div className={classes.submitDock}>
                        {contextHolder}
                        <Button onClick={id ? updateArticle : uploadArticle} type="primary" disabled={loading || notFound}>
                            {id ? 'Save' : 'Submit'}
                        </Button>
                    </div>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
