import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
} from '@xyflow/react';

interface ReferenceEdgeData {
  referenceText?: string;
  type?: 'hierarchy' | 'reference';
}

export default function ReferenceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps & { data?: ReferenceEdgeData }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isReference = data?.type === 'reference';
  const referenceText = data?.referenceText;

  const getEdgeStyle = () => {
    if (isReference) {
      return {
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDasharray: '8,4',
        ...style,
      };
    }
    return {
      stroke: '#64748b',
      strokeWidth: 2,
      ...style,
    };
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={getEdgeStyle()}
      />
      
      {referenceText && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none nodrag nopan bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs border shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <span className="font-medium text-primary">
              {referenceText.length > 30 
                ? `${referenceText.substring(0, 30)}...` 
                : referenceText
              }
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}