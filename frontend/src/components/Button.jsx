/**
 * Button Component - Reusable button with GOLD theme
 * Supports different variants and sizes
 */
function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button' }) {
    // Base styles for all buttons
    const baseStyles = 'font-semibold rounded-xl transition-all duration-300 hover:scale-105';

    // Variant styles (UPDATED TO GOLD #D4AF37)
    const variants = {
        primary: 'bg-[#D4AF37]/90 hover:bg-[#E6C86E] text-black hover:shadow-lg hover:shadow-[#D4AF37]/50',
        outline: 'bg-transparent border-2 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10',
        ghost: 'bg-white/5 hover:bg-white/10 text-white border border-white/10',
    };

    // Size styles
    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {children}
        </button>
    );
}

export default Button;
