import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import TextEditor from "./TextEditor";
import { ChangeEvent, KeyboardEventHandler, useEffect, useState } from "react";
import classes from './EidtPage.module.css'
import type { MenuProps } from 'antd';
import { Button, message} from "antd";
import ContentTable from "./ContentTable";
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

    function uploadArticle(){
        if(title=='' || editorValue=='' || category == '' || category == 'category'|| date == ''){
            messageApi.error("some fields are empty")
            return;
        }
        let data = {title: title, date: date, content: editorValue, category: category}
        let url = "http://localhost:7777/admin/test";
        // let url = "https://wenjunblog.xyz:7777/admin/upload/article";
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
                <BodyLeft>
                    <ContentTable setArticle={null}/>
                </BodyLeft>
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
                                    <div className= {classes.buttonContainer}>
                                        {contextHolder} 
                                        <Button onClick={uploadArticle} type="primary">Submit</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div onClick={closeAll}>
                            <TextEditor editorValue={editorValue} setEditorValue={setEditorValue}/>
                        </div>         
                    </div>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
