import classes from './BubbleBox.module.css'

function BubbleBox(){

    return(
        <div className={classes.bubbleBorder}>
            <div className={classes.bubbleText}>           
                <p>Hi, my name is Wayne. I am currently doing my Master of  Data Analytics program (Statistical Data Science major) in Queensland University of Technology.</p>
                <p> 
                I'm a full stack developer with 1 year industry experience. I specialize in distributed vertical search engine development, and my technical stack is React + Spring + Pytorch.
                </p>

                <p>Except from above, my technical interests include digital/audio signal processing, speech recognition, embedded system programing and NLP related development.</p>
            </div>
        </div>
    )
}

export default BubbleBox