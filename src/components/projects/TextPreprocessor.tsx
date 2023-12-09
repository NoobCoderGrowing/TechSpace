import './TextPreprocessor.scss'

function TextPreprocessor(){
    return( 
        <div className="textPreprocessor">
            <form className='textInput'>
                <div className={`form-group form-wrapper`}>
                    <textarea className={`form-control textArea`} placeholder="Please input preprocessed text"/>
                </div>
                <div className="buttonWrapper">
                    <button type="button" className="btn btn-primary">Sumit</button>
                </div>
                <div className={`form-group form-wrapper`}>
                    <textarea className={`form-control textArea2`} placeholder=""/>
                </div>
            </form>
        </div>
    )
    
}

export default TextPreprocessor;