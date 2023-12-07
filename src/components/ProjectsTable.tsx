import classes from "./ContentTable.module.css"
import { useEffect, useState} from "react";
import ProjectEntry from "./ProjectEntry";
import { Project } from "./TypeDefinition";


export default function ProjectsTable(){


    
    const [data, setData] = useState<Array<Project>>([{name:'Text Preprocessor', url:'textPreprocessor'},{name:'Chineses Tokenizer', url:'chineseTokenizer'}]);
    
    return(
        <div className={classes.container}>
            <div className={classes.content}>
                <h1 className={classes.header}>Projects Table</h1>
                <div className={classes.entryContainer}>
                    {data.map((project) => <ProjectEntry key={project.url} project={project}></ProjectEntry>)}
                </div>
            </div>
        </div>
    )
}