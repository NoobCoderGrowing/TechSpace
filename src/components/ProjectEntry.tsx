import './ProjectEntry.scss';
import {Link} from 'react-router-dom'
import { Project } from './TypeDefinition';

type props = {  
    project: Project | null
}
export default function ProjectEntry({project}: props){
    
    if(project){
        return(
            <>
                <Link className="projectEntry" to={"/projects/"+ project.url}><p className='projectName'>{project.name}</p></Link>
            </>
        )
    }
}
    