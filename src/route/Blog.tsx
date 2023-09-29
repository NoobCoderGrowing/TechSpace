import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import ContentTable from "../components/ContentTable";
import { ReactElement, useState } from "react";
import ArticleView from "../components/ArticleView";
import { Article } from "../components/TypeDefinition";


function Blog(){

    const [article, setArticle] = useState<Article>();

    return(
        <main>  
            <Header/>
            <Body>
                <BodyLeft>
                    <ContentTable setArticle={setArticle}/>
                </BodyLeft>
                <BodyRight>
                    <ArticleView article={article}/>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
export default Blog;