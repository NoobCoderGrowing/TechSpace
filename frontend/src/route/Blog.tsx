import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import ContentTable from "../components/ContentTable";
import ArticleView from "../components/ArticleView";


function Blog(){

    return(
        <main>
            <Header/>
            <Body>
                <BodyLeft>
                    <ContentTable/>
                </BodyLeft>
                {/* 右栏不再切换文章了 —— 点标题会跳到 /blog/<id>/<标题> 独立页。
                    保留两栏框架和这张初始占位图，维持原来的空态观感。 */}
                <BodyRight>
                    <ArticleView article={undefined}/>
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
export default Blog;