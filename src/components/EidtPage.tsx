import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import TextEditor from "./TextEditor";
import { ChangeEvent, useEffect, useState } from "react";
import classes from './EidtPage.module.css'
import { Button, message} from "antd";
import ContentTable from "./ContentTable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from 'moment';
import './EditPageAdditional.css'


export default function EidtPage(){

    const [messageApi, contextHolder] = message.useMessage();
    const [editorValue, setEditorValue] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [startDate, setStartDate] = useState(new Date());


    async function uploadArticle(){
        let data = {title: title, date: date, content: editorValue}
        let url = "https://wenjunblog.xyz:7777/admin/upload/article";
        let jsondata = JSON.stringify(data)
        await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: jsondata,
            credentials: 'include'
        }).then(response => response.json()).then(result=>{
            if(result['uploaded']==true){
                messageApi.info("Uploade Successful")
            }else{
                messageApi.error("Unauthorized Upload")
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
                            <div className={classes.titleContainer}>
                                <label className={classes.title}>ttile</label>
                                <input onChange={handleTitleInput}></input>
                            </div>
                            <div className={classes.dateSubmitContainer}>
                                <div className={classes.dateContainer}>
                                    <label className={classes.date}>date</label>
                                    <DatePicker dateFormat="yyyy-MM-dd" selected={startDate} onChange={datePickerHandler} />
                                </div>
                                <div className= {classes.buttonContainer}>
                                    {contextHolder} 
                                    <Button onClick={uploadArticle} type="primary">Submit</Button>
                                </div>
                            </div>
                        </div>
                        <TextEditor editorValue={editorValue} setEditorValue={setEditorValue}/>         
                    </div>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
