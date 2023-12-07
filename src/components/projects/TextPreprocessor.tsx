import './TextPreprocessor.scss'

function TextPreprocessor(){
    return( 
        <div className="textPreprocessor">
            <form className='textInput'>
                <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Please input preprocessed text</label>
                    <textarea className={`form-control textArea`} placeholder="Enter text"/>
                    
                </div>
                <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Password</label>
                    <input type="password" className="form-control" id="exampleInputPassword1" placeholder="Password"/>
                </div>
                <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="exampleCheck1"/>
                    <label className="form-check-label" htmlFor="exampleCheck1">Check me out</label>
                </div>
                <button type="submit" className="btn btn-primary">Submit</button>
            </form>
        </div>
    )
    
}

export default TextPreprocessor;