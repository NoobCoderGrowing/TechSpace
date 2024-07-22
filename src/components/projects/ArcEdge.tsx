import { BaseEdge,  EdgeLabelRenderer, EdgeProps} from '@xyflow/react';



export default function ArcEdge(props: any) {
  // we are using the default bezier edge when source and target ids are different
  const { sourceX, sourceY, targetX, targetY, id, markerEnd, label } = props;
  const radiusX = (sourceX - targetX) * 0.5;
  const radiusY = 60;
  const edgePath = `M ${sourceX} ${sourceY} A ${radiusX} ${radiusY} 0 1 0 
    ${targetX} ${targetY}`;
  const lableX = (sourceX + targetX)/2
  const lableY = sourceY + radiusY
  return(
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
         <div
           style={{
             position: 'absolute',
             transform: `translate(-50%, -50%) translate(${lableX}px,${lableY}px)`,
             background: '#ffcc00',
             padding: 8,
             borderRadius: 5,
             fontSize: 8,
             fontWeight: 600,
           }}
           className="nodrag nopan"
         >
           {label}
         </div>
       </EdgeLabelRenderer> 
    </> 
  ) 
}
