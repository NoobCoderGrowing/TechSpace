import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyRight from "../layout/BodyRight";
import TextEditor from "./TextEditor";
import { ChangeEvent, KeyboardEventHandler, useEffect, useState } from "react";
import classes from './EidtPage.module.css'
import type { MenuProps } from 'antd';
import { Button, message} from "antd";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from 'moment';
import './EditPageAdditional.css'
import { useDispatch, useSelector } from 'react-redux';
import {State} from '../components/TypeDefinition'
import retriveArticles from "../api/Articles";



export default function EidtPage(){

    const [messageApi, contextHolder] = message.useMessage();
    const [editorValue, setEditorValue] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [category, setCategory] = useState<string>('category');
    const [startDate, setStartDate] = useState(new Date());
    const [display, setDisplay] = useState<string>('none');
    const [inputDisplay, setInputDisplay] = useState<string>('none');

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
                                    <input className={classes.titleInput} onChange={handleTitleInput}></input>
                                </div>
                                <div className={classes.dateSubmitContainer}>
                                    <div className={classes.dateContainer}>
                                        <label className={classes.dateLabel}>Date</label>
                                        <DatePicker dateFormat="yyyy-MM-dd" selected={startDate} onChange={datePickerHandler} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div onClick={closeAll}>
                            <TextEditor editorValue={editorValue} setEditorValue={setEditorValue}/>
                        </div>
                    </div>
                    {/* 固定在视口右下角。祖先链上没有任何 transform/filter/will-change，
                        所以这里的 position:fixed 就是相对视口，滚动时不动，也不会被
                        BodyRight 的 overflow-x 裁掉。
                        contextHolder 必须跟着按钮走 —— antd 的 message context 得挂在
                        能渲染到的地方，uploadArticle 里的 messageApi 才会生效。 */}
                    <div className={classes.submitDock}>
                        {contextHolder}
                        <Button onClick={uploadArticle} type="primary">Submit</Button>
                    </div>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
