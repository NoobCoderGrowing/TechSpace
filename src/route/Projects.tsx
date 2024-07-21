import Header from "../layout/Header";
import Footer from "../layout/Footer";
import ProjectsTable from "../components/ProjectsTable";



function Projects(){
    return(
        <main>  
            <Header/>
                <ProjectsTable/>
            <Footer/>
        </main>
    )
}

export default Projects;