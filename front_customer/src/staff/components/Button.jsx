import React from 'react';

/**
 * Button - Reusable button component with glass effect
 * Supports primary (gold) and secondary (glass) variants
 */
const Button = ({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
    className = '',
    type = 'button',
    fullWidth = false
}) => {
    const baseStyles = `
    px-6 py-3 rounded-xl font-semibold transition-all duration-300
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

    const variants = {
        primary: `
      bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black
      hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:scale-105
      active:scale-95
    `,
        secondary: `
      bg-white/5 backdrop-blur-xl border border-white/10 text-white
      hover:bg-white/10 hover:border-[#FFD700]/50
      hover:shadow-[0_0_20px_rgba(255,215,0,0.2)]
    `,
        danger: `
      bg-gradient-to-r from-red-500 to-red-600 text-white
      hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:scale-105
      active:scale-95
    `,
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;
