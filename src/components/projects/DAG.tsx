import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ArcEdge from './ArcEdge';


const edgeTypes = {
  arc: ArcEdge,
};



const DAG = (props:any) => {

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );
  const { visibility, nodes, onNodesChange, edges, setEdges, onEdgesChange} = props;
  

  return (
    <div  style={{ display: visibility?'block':'none', width: '60vw', height:'30vw', backgroundColor:'deeppink', marginBottom: '5vw'}}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        snapToGrid={true}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="top-right"
        connectionMode={ConnectionMode.Loose}
      >
        <Controls />
        {/* <MiniMap/> */}
        <Background />
      </ReactFlow>
    </div>
  );
};

export default DAG;
