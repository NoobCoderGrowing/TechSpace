import classes from './Footer.module.css'

function Footer(){
    return(
        <footer className={classes.footerContainer}>
            <div className={classes.contact}>
                <div className={classes.email}>
                    <p>Email: <a href="mailto:waynejune.yao@gmail.com">waynejune.yao@gmail.com</a></p>
                </div>
                <div className={classes.linkedIn}>
                    <p>LinkedIn: <a href="https://www.linkedin.com/in/wayne-yao-connect/">linkedin.com/in/wayne-yao-connect</a></p>
                </div>
                <div className={classes.mobileNumber}>
                    <p>Mobile Number: +61 410837649</p>
                </div>
             </div>
            <div className={classes.copyright}>
                <p>&copy; 2023 Wayne June Yao. &nbsp;All rights reserved.</p>
            </div>
        </footer>
    )
}
export default Footer;