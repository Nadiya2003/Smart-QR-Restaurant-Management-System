
function Button({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  variant = 'primary', // 'primary', 'secondary', 'danger'
  className = '',
  ...props 
}) {
  // Base styles for all buttons
  const baseStyles = 'px-6 py-3 rounded-xl font-medium transition-smooth focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant-specific styles
  const variants = {
    primary: 'bg-gold-500 hover:bg-gold-400 text-black shadow-lg hover:shadow-glow active:scale-95',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    danger: 'bg-red-500/80 hover:bg-red-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
