import React from 'react';
import './Card.css';

export const Card = ({ children, variant = 'light', className = '' }) => {
  return (
    <div className={`card ${variant}-card ${className}`}>
      {variant === 'dark' && <div className="noise-overlay"></div>}
      <div className={variant === 'dark' ? 'dark-card-content' : ''}>
        {children}
      </div>
    </div>
  );
};
