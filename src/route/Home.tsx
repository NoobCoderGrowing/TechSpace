import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import BubbleBox from "../components/BubbleBox";
import Gallery from "../components/Gallery";
import profilePhoto from '../assets/profilePhoto.jpeg'
import classes from './Home.module.css'

function Home(){
    return(
        <main>  
            <Header/>
            <Body>
                <BodyLeft>
                    <img className={classes.profilePhoto} src={profilePhoto}/>
                    <div className={classes.bubbleContainer}>
                        <BubbleBox/>
                    </div>
                </BodyLeft>
                <BodyRight>
                    <div className={classes.title}>
                        <h1>Recent Top 5 Hits</h1>
                    </div>
                    <div className={classes.galleryContainer}>
                        <Gallery/>
                    </div>    
                </BodyRight>
            </Body>
            <Footer/>
        </main>
    )
}
export default Home;