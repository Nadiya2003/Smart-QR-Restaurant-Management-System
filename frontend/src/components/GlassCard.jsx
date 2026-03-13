/**
 * GlassCard Component - Reusable glassmorphism card
 * Features backdrop blur, semi-transparent background, and border
 */
function GlassCard({ children, className = '', ...props }) {
    return (
        <div 
            className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-6 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export default GlassCard;
