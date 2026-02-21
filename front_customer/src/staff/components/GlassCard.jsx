import React from 'react';

/**
 * GlassCard - Reusable glassmorphism card component
 * Dark theme with gold accents and blur effects
 */
const GlassCard = ({ children, className = '', onClick, hover = true }) => {
    return (
        <div
            onClick={onClick}
            className={`
        bg-white/5 backdrop-blur-xl border border-white/10
        rounded-2xl p-6 shadow-2xl
        ${hover ? 'hover:bg-white/10 hover:border-[#FFD700]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.15)]' : ''}
        ${className}
      `}
            style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            }}
        >
            {children}
        </div>
    );
};

export default GlassCard;
