import { useState, useEffect } from 'react';

/**
 * TableSelection Component
 * Displays a visual grid of tables based on area and availability
 */
function TableSelection({ areaId, date, time, selectedTableId, onSelectTable }) {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (areaId && date && time) {
            fetchAvailability();
        }
    }, [areaId, date, time]);

    const fetchAvailability = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/reservations/availability?area_id=${areaId}&date=${date}&time=${time}`);
            const data = await response.json();
            if (response.ok) {
                setTables(data.tables);
            } else {
                setError(data.message || 'Failed to load tables');
            }
        } catch (err) {
            setError('Network error loading tables');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'available': return 'bg-[#28a745] hover:bg-[#218838]';
            case 'reserved': return 'bg-[#ffc107]';
            case 'occupied': return 'bg-[#dc3545]'; // "Active" in user's image
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = (status) => {
        if (status === 'occupied') return 'Active';
        if (status === 'reserved') return 'Reserved';
        if (status === 'available') return 'Available';
        return status;
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading table layout...</div>;
    if (error) return <div className="text-center py-10 text-red-400">{error}</div>;
    if (!areaId) return <div className="text-center py-10 text-gray-500 border border-dashed border-white/10 rounded-xl">Please select a dining area first</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-center text-xl font-bold text-[#D4AF37] uppercase tracking-wider mb-4">
                Restaurant Table Layout
            </h3>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {tables.map((table) => {
                    const isSelected = selectedTableId === table.id;
                    const isDisabled = table.current_status !== 'available';

                    return (
                        <button
                            key={table.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => onSelectTable(table)}
                            className={`
                                relative p-4 rounded-xl transition-all duration-200
                                flex flex-col items-center justify-center min-h-[100px]
                                ${isSelected ? 'ring-4 ring-white scale-105 z-10 shadow-2xl' : 'shadow-lg'}
                                ${isDisabled ? 'cursor-not-allowed opacity-90' : 'hover:scale-105 active:scale-95'}
                                ${getStatusColor(table.current_status)}
                            `}
                        >
                            <span className="text-lg font-black text-white mb-1">
                                #{table.table_number}
                            </span>
                            <span className="text-[10px] font-bold text-white/90 uppercase tracking-tight">
                                {getStatusLabel(table.current_status)}
                            </span>
                            
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 bg-white text-black rounded-full p-1 shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            <div className="mt-2 text-[8px] text-white/60 bg-black/20 px-2 py-0.5 rounded-full">
                                {table.capacity} Guests
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs mt-8 pb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="w-3 h-3 rounded bg-[#28a745]"></span>
                    <span className="text-gray-300 font-medium">Available</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="w-3 h-3 rounded bg-[#ffc107]"></span>
                    <span className="text-gray-300 font-medium">Reserved</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="w-3 h-3 rounded bg-[#dc3545]"></span>
                    <span className="text-gray-300 font-medium">Active</span>
                </div>
            </div>
            
            {tables.length === 0 && (
                <p className="text-center text-gray-500 py-4">No tables found in this area.</p>
            )}
        </div>
    );
}

export default TableSelection;
