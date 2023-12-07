import Header from "../../layout/Header";
import Footer from "../../layout/Footer";
import Body from "../../layout/Body";
import BodyLeft from "../../layout/BodyLeft";
import BodyRight from "../../layout/BodyRight";
import ProjectsTable from "../../components/ProjectsTable";
import './TextPreprocessor.scss'

function TextPreprocessor(){
    return(
        <main>  
            <Header/>
            <Body>
                <BodyLeft>
                    <ProjectsTable/>
                </BodyLeft>
                <BodyRight>
                    <div className="superFun">
                    </div>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
    
}

export default TextPreprocessor;