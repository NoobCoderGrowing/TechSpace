import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import ContentTable from "../components/ContentTable";

function Blog(){
    return(
        <main>  
            <Header/>
            <Body>
                <BodyLeft>
                    <ContentTable/>
                </BodyLeft>
                <BodyRight>
                    
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
export default Blog;