import React, { useCallback, useEffect } from 'react';
import { Handle, useNodeConnections, useReactFlow } from '@xyflow/react';

const BreadboardHandle = ({
  type,
  position,
  id,
  className,
  style,
  ...rest
}) => {
  // Extract the base pin ID from the handle ID
  const basePinId = id.split('handle-')[1].split('-').slice(1).join('-');
  const reactFlowInstance = useReactFlow();
  
  // Get connections for both source and target handles of this pin
  const sourceConnections = useNodeConnections({
    type: 'source',
    id: `handle-source-${basePinId}`
  });
  
  const targetConnections = useNodeConnections({
    type: 'target',
    id: `handle-target-${basePinId}`
  });

  // Calculate total connections for this pin
  const totalConnections = sourceConnections.length + targetConnections.length;

  // Log connection status when it changes
  useEffect(() => {
    if (totalConnections > 0) {
      console.log(`Breadboard handle ${id} has ${totalConnections} connections`);
      
      // Get the parent node ID
      const parentNodeId = id.split('-')[0];
      
      // Trigger a global update to force connection validation
      const { getNodes, setNodes, getEdges } = reactFlowInstance;
      if (getNodes && setNodes) {
        const nodes = getNodes();
        
        // Force update all nodes to trigger connection validation
        setTimeout(() => {
          setNodes([...nodes]);
        }, 50);
      }
    }
  }, [totalConnections, id, reactFlowInstance]);

  // Allow multiple connections for breadboard pins
  const validateConnection = useCallback(() => {
    return true;
  }, []);

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      isConnectable={validateConnection()}
      className={`${className} ${totalConnections > 0 ? 'connected' : ''}`}
      style={{
        ...style,
        backgroundColor: totalConnections > 0 ? '#00ff00' : '#000000',
        cursor: 'pointer',
        width: '8px',
        height: '8px',
        zIndex: 10
      }}
      data-connections={totalConnections}
      data-pin-id={basePinId}
      {...rest}
    />
  );
};

export default BreadboardHandle;