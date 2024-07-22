import { useCallback, useEffect } from 'react';
import './TextPreprocessor.scss'
import DAG from './DAG'
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    Node,
    Edge,
    MarkerType,
  } from '@xyflow/react';


function TextPreprocessor(){

    const [visibility, setVisibility] = useState<boolean>(false)
    const [userInput, setUserInput] = useState<string>('')
    const [initialNodes, setInitialNodes] = useState<Node[]>([])
    const [initialEdges, setInitialEdges] = useState<Edge[]>([])
    

    const dispatch = useDispatch();

    function hideProjectTable(){
        dispatch({
            type:'HIDEPROJECTT',
            payload: ''
        });    
    }
    useEffect(()=>{
        hideProjectTable();
    },[])

    
    function graphCalculation(){
        let data = {userInput: userInput}
        let jsondata = JSON.stringify(data)
        const baseURL:string = import.meta.env.VITE_SEGMENT_URL
        let url = baseURL + "segment/NShortestPath"  
        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: jsondata,
        }).then(response => response.json()).then(result=>{
            console.log(result)
            // setInitialNodes(result['initialNodes'])
            // setInitialEdges(result['initialEdges'])
        })
        setVisibility(true)
    }
    
    function handleUserInput(event){
        setUserInput(event.target.value)
    }

    // const initialNodes: Node[] = [
    //     {
    //       id: 'self-1',
    //       data: { label: '1' },
    //       position: { x: 100, y: 500 },
    //     },
    //   ];
      
    //   const initialEdges: Edge[] = [
    //     {
    //       id: 'edge-self-12',
    //       source: 'self-1',
    //       target: 'self-2',
    //       type: 'arc',
    //       markerEnd: { type: MarkerType.Arrow },
    //       label: 'edge label2',
    //     },
    //   ];

    return( 
        <div className="textPreprocessor">
            <form className='textInput'>
                <div className={`form-group form-wrapper`}>
                    <textarea onChange={handleUserInput} className='userInput' placeholder="请输入需要分词的中文句子"/>
                </div>
                <div className="buttonWrapper">
                    <button onClick={graphCalculation} type="button" className="btn btn-primary">生成有向图</button>
                </div>
            </form>
            <DAG visibility={visibility} setVisibility={setVisibility}/>
        </div>
    )
    
}

export default TextPreprocessor;