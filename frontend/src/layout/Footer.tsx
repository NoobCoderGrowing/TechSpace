import classes from './Footer.module.css'

function Footer(){
    return(
        <footer className={classes.footerContainer}>
            <div className={classes.contact}>
                <div className={classes.email}>
                    <p>Email: <a href="mailto:waynejune.yao@gmail.com">waynejune.yao@gmail.com</a></p>
                </div>
                <div className={classes.linkedIn}>
                    <p>Weibo: <a href="">to be updated</a></p>
                </div>
                <div className={classes.mobileNumber}>
                    <p>Mobile Number: +86 13309661021</p>
                </div>
             </div>
            <div className={classes.copyright}>
                <p>&copy; 2023 Wenjun Yao. &nbsp;All rights reserved.</p>
            </div>
        </footer>
    )
}
export default Footer;