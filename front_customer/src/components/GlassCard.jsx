function GlassCard({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass p-6 rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export default GlassCard;
