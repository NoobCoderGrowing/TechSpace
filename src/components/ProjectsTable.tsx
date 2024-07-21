import {useState} from "react";
import ProjectEntry from "./ProjectEntry";
import { Project } from "./TypeDefinition";
import "./ProjectsTable.scss"


export default function ProjectsTable(){
    
    const [data, setData] = useState<Array<Project>>([{name:'N最短路径分词', url:'textPreprocessor'},/*{name:'Chineses Tokenizer', url:'chineseTokenizer'}/*{name:'Chineses Tokenizer', url:'chineseTokenizer'}]*/]);
    
    return(
        <div className='container'>
            <div className='content'>
                 <h1 className='header'>Projects Table</h1> 
                 <div className='entryContainer'>
                    {data.map((project) => 
                    <ProjectEntry key={project.url} project={project}></ProjectEntry>)}
                </div> 
             </div>
        </div>
    )
}