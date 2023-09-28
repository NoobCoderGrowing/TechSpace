import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import TextEditor from "./TextEditor";
import { useEffect, useState } from "react";
import classes from './EidtPage.module.css'
import { Button } from "antd";
import ContentTable from "./ContentTable";


export default function EidtPage(){

    const [editorValue, setEditorValue] = useState<string>('');

    function uploadArticle(){
        console.log(editorValue)
    }

    return(
        <main>  
            <Header/>
            <Body>
                <BodyLeft>
                    <ContentTable/>
                </BodyLeft>
                <BodyRight>
                    <div>
                        <div className={classes.titleDateContainer}>
                            <div className={classes.titleContainer}>
                                <label className={classes.title}>ttile</label>
                                <input></input>
                            </div>
                            <div className={classes.dateSubmitContainer}>
                                <div className={classes.dateContainer}>
                                    <label className={classes.date}>date</label>
                                    <input></input>
                                </div>
                                <div className= {classes.buttonContainer}>
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
