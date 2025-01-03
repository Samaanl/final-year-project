import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './Tooltip.css';

const Tooltip = ({ children, text }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeout = useRef(null);

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => {
      setShowTooltip(true);
    }, 1000); // Show tooltip after 1 second
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout.current);
    setShowTooltip(false);
  };

  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2500); // Hide tooltip after 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  return (
    <div
      className="tooltip-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && <div className="tooltip-text">{text}</div>}
    </div>
  );
};

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
};

export default Tooltip;