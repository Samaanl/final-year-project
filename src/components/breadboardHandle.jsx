import React, { useCallback } from 'react';
import { Handle, useNodeConnections } from '@xyflow/react';

const BreadboardHandle = ({
  type,
  position,
  id,
  className,
  style,
  'data-column': columnIndex,
  ...rest
}) => {
  // Extract the base pin ID from the handle ID (e.g., "digital-7" from "handle-source-digital-7")
  const basePinId = id.split('handle-')[1].split('-').slice(1).join('-');
  
  // Extract column info if this is a main hole
  const isMainHole = id.includes('main-hole');
  const colMatch = isMainHole ? id.match(/main-hole-\d+-(\d+)/) : null;
  const column = columnIndex !== undefined ? columnIndex : (colMatch ? parseInt(colMatch[1]) : null);
  
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

  // For breadboard middle holes, we want to allow multiple connections per column
  // but still limit connections to unused holes in other columns
  const validateConnection = useCallback(() => {
    if (isMainHole) {
      // For main holes in the breadboard, we allow connections even if other holes in the same column
      // are already connected - this facilitates column-wise connectivity
      return true;
    } else {
      // For other types of connections (rails, etc.), use the original logic
      return totalConnections === 0;
    }
  }, [totalConnections, isMainHole]);

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
      data-column={column}
      {...rest}
    />
  );
};

export default BreadboardHandle;