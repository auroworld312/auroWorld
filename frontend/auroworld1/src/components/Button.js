import React from 'react';
import './Button.css'; 

//button
function Button({ children, variant, className, onClick, disabled }) {
  const btnType = variant ? variant : 'primary';

  const finalClassName = `my-btn ${btnType} ${className ? className : ''}`;

  return (
    <button
      className={finalClassName}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;