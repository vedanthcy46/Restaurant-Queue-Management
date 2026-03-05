import React from 'react';

const Button = ({ text, onClick, type = "button", disabled = false }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className="btn"
        >
            {text}
        </button>
    );
};

export default Button;
