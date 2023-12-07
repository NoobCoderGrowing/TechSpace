import classes from './TableEntry.module.css';
import {Link} from 'react-router-dom'
import { Project } from './TypeDefinition';
import { useEffect } from 'react';

type props = {  
    project: Project | null
}
export default function ProjectEntry({project}: props){
    
    if(project){
        return(
            <>
                <Link className={classes.tableEntry} to={"/projects/"+ project.url}>{project.name}</Link>
            </>
        )
    }
}
    