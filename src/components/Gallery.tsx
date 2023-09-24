import classes from './Gallery.module.css'
import dog from '../assets/dog-1383342.jpeg'
import top1 from '../assets/top1_hit.jpg'
import {message} from 'antd'
import {useNavigate} from 'react-router-dom'

function Gallery(){
    const navigate = useNavigate();
    function navigateTo(){
        navigate('/resume')
    }

    function infoMessage(){
        message.warning('still under development')
    }
    return(
        <div className={classes.gallery}>   
            <img onClick={navigateTo} className={classes.galleryImg} src={top1} alt="Image 1"/>
            <img onClick={infoMessage} className={classes.galleryImg}  src={dog} alt="Image 2"/>
            <img onClick={infoMessage} className={classes.galleryImg}  src={dog} alt="Image 3"/>
            <img onClick={infoMessage} className={classes.galleryImg}  src={dog} alt="Image 3"/>
            <img onClick={infoMessage} className={classes.galleryImg}  src={dog} alt="Image 3"/>
        </div>
    )
};
export default Gallery;