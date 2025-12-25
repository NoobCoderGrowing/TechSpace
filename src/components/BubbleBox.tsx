import classes from './BubbleBox.module.css'

function BubbleBox(){

    return(
        <div className={classes.bubbleBorder}>
            <div className={classes.bubbleText}>           
                <p>你好，我是文俊，欢迎来到我的博客空间。</p>
                <p>好记性不如烂笔头，我专注于搜索引擎研发，这里记录着我的所学所悟，如果我的笔记也对你有所帮助，给我点个赞吧 :)</p>
            </div>
        </div>
    )
}

export default BubbleBox