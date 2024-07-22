import Header from "../layout/Header";
import Footer from "../layout/Footer";
import ProjectsTable from "../components/ProjectsTable";
import { Outlet } from "react-router-dom";



function Projects(){
    return(
        <main>  
            <Header/>
                <ProjectsTable/>
                <Outlet/>
            <Footer/>
        </main>
    )
}

export default Projects;