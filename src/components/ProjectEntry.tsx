import './TableEntry.scss';
import {Link} from 'react-router-dom'
import { Project } from './TypeDefinition';

type props = {  
    project: Project | null
}
export default function ProjectEntry({project}: props){
    
    if(project){
        return(
            <>
                <Link className="tableEntry" to={"/projects/"+ project.url}><p>{project.name}</p></Link>
            </>
        )
    }
}
    