import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useOrder } from '../hooks/useOrder';
import { Button } from '../components/ui/Button';
import { ChevronLeftIcon, UtensilsIcon, MapPinIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

export function TableSelectionPage({ onNavigate, isChangingTable = false }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTable, tableNumber, changeTable } = useOrder();

  const [activeArea, setActiveArea] = useState(null);

  useEffect(() => {
    fetchTables();
    
    // Polling for live status (Requirement 11)
    const interval = setInterval(fetchTables, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tableNumber && !selectedTable) {
        setSelectedTable(tableNumber);
        
        // Find the area of the table to auto-switch tab
        const table = tables.find(t => t.table_number.toString() === tableNumber.toString());
        if (table) setActiveArea(table.area_name);
    }
  }, [tableNumber, tables]);

  const fetchTables = async () => {
    try {
      const data = await api.get('/orders/tables');
      const tableData = data.tables || [];
      setTables(tableData);
      
      // Default to first area if none active
      if (!activeArea && tableData.length > 0) {
         const areas = [...new Set(tableData.map(t => t.area_name || 'Main Area'))];
         setActiveArea(areas[0]);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTable) return;
    
    if (isChangingTable) {
        try {
            await changeTable(selectedTable);
            onNavigate('dashboard');
        } catch (error) {
            alert('Failed to update table. Please try again.');
        }
    } else {
        setTable(selectedTable);
        onNavigate('menu');
    }
  };

  const groupedTables = tables.reduce((acc, table) => {
    const area = table.area_name || 'Main Area';
    if (!acc[area]) acc[area] = [];
    acc[area].push(table);
    return acc;
  }, {});

  const areas = Object.keys(groupedTables);
  const currentAreaTables = groupedTables[activeArea] || [];

  if (loading && tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center animate-pulse mb-4">
           <UtensilsIcon className="w-8 h-8 text-amber-500" />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Floor Map</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Dynamic Header */}
      <div className="bg-white px-6 pt-6 pb-2 shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => isChangingTable ? onNavigate('dashboard') : onNavigate('steward')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-none">
              {isChangingTable ? 'Change Table' : 'Melissa\'s Tables'}
            </h1>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[2px] mt-1">Live Status Dashboard</p>
          </div>
        </div>

        {/* Area Tabs (Live Layout Requirement) */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
           {areas.map(area => {
              const isActive = activeArea === area;
              const count = groupedTables[area].length;
              const availCount = groupedTables[area].filter(t => !t.active_order_status && !t.reservation_time).length;
              
              return (
                 <button
                    key={area}
                    onClick={() => setActiveArea(area)}
                    className={`
                       whitespace-nowrap px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2
                       ${isActive 
                          ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                       }
                    `}
                 >
                    {area}
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                       {availCount}/{count}
                    </span>
                 </button>
              );
           })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="flex justify-between items-center mb-6">
           <div>
              <h2 className="text-lg font-black text-gray-900">{activeArea}</h2>
              <p className="text-xs text-gray-500 font-medium tracking-tight">Tap an available table to select</p>
           </div>
           
           <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 <span className="text-[10px] font-bold text-gray-400">AVAIL</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 <span className="text-[10px] font-bold text-gray-400">BUSY</span>
              </div>
           </div>
        </div>

        {Object.keys(groupedTables).length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 shadow-sm">
                <div className="bg-gray-50 p-6 rounded-full mb-6">
                    <XCircleIcon className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Service Offline</h3>
                <p className="text-gray-500 text-sm max-w-[200px] leading-relaxed">
                    Tables aren&apos;t loading. Please check your connection.
                </p>
                <Button 
                    onClick={fetchTables}
                    className="mt-8 bg-gray-900 text-white rounded-[20px] px-8 py-4 h-auto"
                >
                    Retry Connection
                </Button>
            </div>
        )}

        <div className="grid grid-cols-2 xs:grid-cols-2 gap-3">
          {currentAreaTables.map((table) => {
            const isOccupied = !!table.active_order_status;
            const isReserved = !!table.reservation_time;
            const isBlocked = isOccupied || isReserved;
            const isSelected = selectedTable?.toString() === table.table_number?.toString();
            
            return (
              <button
                key={table.id}
                disabled={isBlocked}
                onClick={() => setSelectedTable(table.table_number)}
                className={`
                  relative p-4 rounded-2xl border-[1.5px] transition-all duration-300 flex flex-col justify-between min-h-[120px] text-left
                  ${isReserved 
                    ? 'bg-[#FFFBEB] border-[#FEF3C7]' 
                    : isOccupied
                      ? 'bg-[#FEF2F2] border-[#FCA5A5]'
                      : 'bg-[#F0FDF4] border-[#86EFAC]'
                  }
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.02] shadow-lg' : 'shadow-sm'}
                  ${isBlocked ? 'cursor-not-allowed opacity-90' : 'hover:shadow-md active:scale-95'}
                `}
              >
                {/* Top Row: Num and Dot */}
                <div className="flex justify-between items-center w-full">
                  <span className="text-xl font-extrabold text-[#111827]">T-{table.table_number}</span>
                  <span className="text-lg">{isBlocked ? '🔴' : '🟢'}</span>
                </div>
                
                {/* Secondary Info */}
                <div className="space-y-1 mt-1">
                  <div className="flex items-center gap-1 text-[#6B7280] text-[11px] font-bold">
                    <span>👥 {table.capacity || 4} Seats</span>
                  </div>

                  {/* Dynamic Badges (Steward Dashboard Type) */}
                  {isReserved && !isOccupied && (
                     <div className="mt-1 bg-amber-100/50 text-[#B45309] px-2 py-0.5 rounded-md text-[9px] font-bold uppercase truncate border border-amber-200">
                        📅 {table.reservation_customer || 'Reserved'} @ {table.reservation_time?.substring(0, 5)}
                     </div>
                  )}

                  {isOccupied && (
                     <div className="space-y-1">
                        {table.steward_name && (
                           <div className="text-[#059669] text-[9px] font-extrabold flex items-center gap-1">
                              👤 {table.steward_name}
                           </div>
                        )}
                        <div className="bg-[#DBEAFE] text-[#1E40AF] px-1.5 py-0.5 rounded text-[8px] font-bold inline-block uppercase">
                           {table.active_order_status || 'In Use'}
                        </div>
                     </div>
                  )}

                  {!isBlocked && (
                     <div className="text-green-600 text-[10px] font-bold mt-1">
                        Ready for service
                     </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {isSelected && !isBlocked && (
                   <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in">
                      <CheckCircleIcon className="w-4 h-4" />
                   </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex justify-center z-30">
        <div className="w-full max-w-md">
          <Button
            onClick={handleConfirm}
            disabled={!selectedTable}
            className={`w-full py-6 rounded-2xl font-bold uppercase tracking-wider transition-all h-auto
               ${selectedTable ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-100 text-gray-400'}
            `}
          >
            {isChangingTable ? 'Update Table' : 'Confirm Table'}
          </Button>
        </div>
      </div>
    </div>
  );
}
