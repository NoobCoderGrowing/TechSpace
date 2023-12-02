import classes from './BubbleBox.module.css'

function BubbleBox(){

    return(
        <div className={classes.bubbleBorder}>
            <div className={classes.bubbleText}>           
                <p>Hi, my name is Wayne. I am currently doing my Master of  Data Analytics program (Statistical Data Science major) in Queensland University of Technology.</p>
                <p> 
                I'm a full stack developer, and my technical stack is React + Spring, and I have about 1 year industry experience in developing commercial vertical search engine. 
                </p>

                <p>I'm currently seeking an intership/part time job, and willing to relocate. My interest includes full stack, backend, frontend and search engine relevant development.</p>
            </div>
        </div>
    )
}

export default BubbleBox