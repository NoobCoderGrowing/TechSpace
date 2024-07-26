import { useCallback, useEffect } from 'react';
import './TextPreprocessor.scss'
import DAG from './DAG'
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    useNodesState,
    useEdgesState,
    MarkerType,
  } from '@xyflow/react';


function TextPreprocessor(){

    const [visibility, setVisibility] = useState<boolean>(false)
    const [userInput, setUserInput] = useState<string>('')
    const [customDict, setCustomDict] = useState<string[]>([])
    const [NPaths, setNPaths] = useState<number>(1)
    const [paths, setPaths] = useState([])
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [pathsString, setPathsString] = useState([])
    const [graph, setGraph] = useState([])

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
        let data = {userInput: userInput,
                    NPaths: NPaths,
                    customDict: customDict
                }
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
            if(result.length !=0){
                let paths = result[0]
                let graph = result[1]
                setPaths(paths)
                setGraph(graph)
                setVisibility(true)
            }
            
        })
    }

    function generateShortestPath(){
        graphCalculation()
        let shortestPath = paths[0]
        let cost = Object.keys(shortestPath)[0]
        let terms = Object.values(shortestPath)[0]
        let uniqueKey = 0;
        let temp = []
        Object.keys(terms).map((key=>{
            let source = key
            let label:string | any = terms[key]
            let target = parseInt(source) + label.length
            temp.push({
                id: uniqueKey+=1,
                source: source.toString(),
                target: target.toString(),
                type: 'arc',
                markerEnd: { type: MarkerType.Arrow },
                label: label,
                style:{
                    strokeWidth: 2,
                    stroke: 'black',
                }
            })

        }))
        setEdges(temp)
    }

    function generateNodesEdges(){
        graphCalculation();
        let nodeStartX = 0
        let nodeStratY = 500
        let temPNodes = []
        let tempEdges = []
        let uniqueKey = 0
        graph.map((item)=>{
            temPNodes.push({
                id: item.id.toString(),
                data: {label: item.id.toString()},
                position: {
                    x: nodeStartX+=200,
                    y: nodeStratY
                }
            })
            if(Object.keys(item['outEdges']).length!= 0){
                
                Object.keys(item['outEdges']).forEach((key)=>{
                    uniqueKey +=1
                    tempEdges.push({
                        id: uniqueKey,
                        source: item.id.toString(),
                        target: key.toString(),
                        type: 'arc',
                        markerEnd: { type: MarkerType.Arrow },
                        label: item['outEdges'][key].word,
                        style:{
                            strokeWidth: 2,
                            stroke: 'white',
                        }
                    })
                })
            }
        })
        setNodes(temPNodes)
        setEdges(tempEdges)
    }
    
    function handleUserInput(event){
        setUserInput(event.target.value)
    }

    function handleCustomDict(event){
        let list = []
        let dict = event.target.value;
        dict = dict.replace(',', "，")
        dict = dict.split(' ').join('')
        dict = dict.split('，')
        dict.map((item=>{
            list.push(item)
        }))
        setCustomDict(list)
    }

    function showNPaths(){
        graphCalculation()
        let pathsString = []
        paths.map((item)=>{
            let path = Object.values(item)[0]
            let pathArray:string[] = Object.values(path)
            pathsString.push(pathArray.join(", "))    
        })
        setPathsString(pathsString)
    }

    function handleNPathsSetting(event){
        setNPaths(parseInt(event.target.value))
    }

    return( 
        <div className="textPreprocessor">
            <form className='textInput'>
                <div className={`form-group form-wrapper`}>
                    <div className="label-wrapper">
                        <label>原始输入:</label>
                    </div>
                    <textarea onChange={handleUserInput} className='userInput' placeholder="请输入需要分词的中文句子(忽略所有非中文字符)"/>
                </div>
                <div className={`form-group form-wrapper`}>
                    <div className="label-wrapper">
                        <label>路径数目:</label>
                    </div>
                    <select onClick={handleNPathsSetting} id="NPaths">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>
                <div className={`form-group form-wrapper`}>
                    <div className="label-wrapper">
                        <label>分词词典:</label>
                    </div>
                    <textarea onChange={handleCustomDict} className='userInput' placeholder='请输入自定义分词词典，用逗号分隔，如"星期天，阳光",'/>
                </div>
                <div className="buttonWrapper">
                    <button onClick={generateNodesEdges} type="button" className="btn btn-primary">生成有向图</button>
                    <button onClick={generateShortestPath} type="button" className="btn btn-primary">生成最短路径</button>
                    <button onClick={showNPaths} type="button" className="btn btn-primary">获取N最短路径</button>
                </div>
                <div >
                    {pathsString.map((path)=>
                    <p className="NPaths"> {path} </p>)}
                </div>
            </form>
            <DAG  nodes={nodes} onNodesChange={onNodesChange} edges={edges} setEdges={setEdges} onEdgesChange={onEdgesChange} visibility={visibility}/>
        </div>
    )
    
}

export default TextPreprocessor;