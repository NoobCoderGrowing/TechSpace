import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import ProjectsTable from "../components/ProjectsTable";
import { Outlet } from "react-router-dom";

function Projects(){
    return(
        <main>  
            <Header/>
            <Body>
                <BodyLeft>
                    <ProjectsTable/>
                </BodyLeft>
                <BodyRight>
                    <Outlet/>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}

export default Projects;