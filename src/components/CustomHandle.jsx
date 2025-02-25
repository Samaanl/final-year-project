import React, { useCallback } from 'react';
import { Handle, useNodeConnections } from '@xyflow/react';

const CustomHandle = ({
  type,
  position,
  id,
  className,
  nodeId,
  style,
  ...rest
}) => {
  // Extract the base pin ID from the handle ID (e.g., "digital-7" from "handle-source-digital-7")
  const basePinId = id.split('handle-')[1].split('-').slice(1).join('-');
  
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

  const validateConnection = useCallback(() => {
    // If the pin already has any connection (source or target), prevent new connections
    return totalConnections === 0;
  }, [totalConnections]);

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
        cursor: validateConnection() ? 'select' : 'not-allowed'
      }}
      {...rest}
    />
  );
};

export default CustomHandle;