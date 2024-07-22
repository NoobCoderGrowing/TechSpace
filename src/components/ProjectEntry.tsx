import './ProjectEntry.scss';
import {Link} from 'react-router-dom'
import { Project } from './TypeDefinition';

type props = {  
    project: Project | null
    onClick: Function | any
}
export default function ProjectEntry({project, onClick}: props){
    
    if(project){
        return(
            <>
                <Link onClick={onClick} className="projectEntry" to={"/projects/"+ project.url}><p className='projectName'>{project.name}</p></Link>
            </>
        )
    }
}
    