import classes from './BubbleBox.module.css'

function BubbleBox(){

    return(
        <div className={classes.bubbleBorder}>
            <div className={classes.bubbleText}>           
                <p>Hi, my name is Wayne. I graduated from The University of Queensland in 2022 with the degree of Master of Information Technology, and currently doing my Master of Statistical Data Science degree in Queensland University of Technology.</p>
                <p> 
                I'm a full stack developer, and my technical stack is react + spring. I have 1 year industry experience with 4 months as a front-end software intern at <a href='https://appen.com/'>Appen</a> and 10 months as a java backend developer at <a href='https://www.yiyaowang.com/'>YI</a>. <a href='https://www.yiyaowang.com/'>YI</a> is a leading pharmaceutical e-commerce in China, and I'm responsible for the maintenance and development of their seach engine for both their mobile and PC applications.   
                </p>

                <p>I'm currently seeking an intership/part time job, and willing to relocate during my 2023 summer vacation. My interest includes full stack, backend, frontend and e-commerce search engine development.</p>
            </div>
        </div>
    )
}

export default BubbleBox