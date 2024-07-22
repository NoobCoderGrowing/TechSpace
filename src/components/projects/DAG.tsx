import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  ConnectionMode,
  MarkerType,
  BezierEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ArcEdge from './ArcEdge';


const edgeTypes = {
  arc: ArcEdge,
};



const DAG = (props:any) => {
  const [nodes, , onNodesChange] = useNodesState(props.initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(props.initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );
  const { visibility, setVisibility } = props;
  

  return (
    <div  style={{ display: visibility?'block':'none', width: '80vw', height:'40vw', backgroundColor:'deeppink', marginBottom: '5vw'}}>
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
        <MiniMap/>
        <Background />
      </ReactFlow>
    </div>
  );
};

export default DAG;
