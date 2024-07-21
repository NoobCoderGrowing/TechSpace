import Header from "../layout/Header";
import Footer from "../layout/Footer";
import Body from "../layout/Body";
import BodyLeft from "../layout/BodyLeft";
import BodyRight from "../layout/BodyRight";
import BubbleBox from "../components/BubbleBox";
import Gallery from "../components/Gallery";
import profilePhoto from '../assets/profilePhoto.jpeg'
import classes from './Home.module.css'
import likes from "../assets/likes.png"
import { useDispatch} from 'react-redux'
import { useEffect, useState } from "react";
import store from "../store";


function Home(){

    const dispatch = useDispatch();
    const [likesCount, setLikesCount] = useState<number>(0)
    const unsubscribe = store.subscribe(()=>{
        const state = store.getState()
        setLikesCount(state.likes.homeLikes)
    })
    const baseURL:string = import.meta.env.VITE_BASE_URL

    function getHomeLikes(){
        let url = baseURL + "comment/home/getHomeLikes"
        fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            credentials: 'include',
        }).then(response => {
            const responseJson = response.json();
            return responseJson;
        }).then(result =>{
            let ret = result['likesCount']
            dispatch({
                type:'GETHOMELIKES',
                payload: ret
            });
        })
    }
    
   function incLikes(){
        let url = baseURL + "comment/home/incHomeLikes"
        fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            credentials: 'include',
        }).then(response => {
          const responseJson = response.json();
          return responseJson;
        }).then(result =>{
            let ret = result['likesCount']
            dispatch({
                type:'INCHOMELIKES',
                payload: ret
            });
        })
    }

    useEffect(()=>{
        getHomeLikes();
    },[])
  
  
    return(
        <main>  
            <Header/>
            <Body>
                <BodyLeft>
                    <img className={classes.profilePhoto} src={profilePhoto}/>
                    <div className={classes.bubbleContainer}>
                        <BubbleBox/>
                    </div>
                    <div className={classes.likesContainer}>
                        <img onClick={incLikes} className={classes.likes}  src={likes} alt="likes"/>
                        <p className={classes.likesCount}>{likesCount}</p>
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