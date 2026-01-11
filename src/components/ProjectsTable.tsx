import {useState} from "react";
import ProjectEntry from "./ProjectEntry";
import { Project } from "./TypeDefinition";
import "./ProjectsTable.scss"
import store from "../store";
import { useDispatch} from 'react-redux'



export default function ProjectsTable(){
    
    const [data, setData] = useState<Array<Project>>([{name:'N最短路径分词', url:'textPreprocessor'},/*{name:'Chineses Tokenizer', url:'chineseTokenizer'}/*{name:'Chineses Tokenizer', url:'chineseTokenizer'}]*/]);
    const [visible, setVisible] = useState<boolean>(true)

    const unsubscribe = store.subscribe(()=>{
        const state = store.getState()
        setVisible(state.visible.projectTableV)
    })

    const dispatch = useDispatch();

    function hideProjectTable(){
        dispatch({
            type:'HIDEPROJECTT',
            payload: ''
        });    
    }
    
    return(
        <div style={{display:visible?'flex':'none'}} className='container'>
            <div className='content'>
                 <h1 className='header'>Projects Table</h1> 
                 <div className='entryContainer'>
                    {data.map((project) => 
                    <ProjectEntry onClick={hideProjectTable} key={project.url} project={project}></ProjectEntry>)}
                </div> 
             </div>
        </div>
    )
}