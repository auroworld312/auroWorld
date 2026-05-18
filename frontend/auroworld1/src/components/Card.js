import React from 'react';
import './Card.css';

function Card({ children, className, variant }) {
  const cardType = variant === 'dark' ? 'dark-border' : 'default-border';

  const finalClassName = `my-card ${cardType} ${className ? className : ''}`;

  return (
    <div className={finalClassName}>
      {children}
    </div>
  );
}

export default Card;