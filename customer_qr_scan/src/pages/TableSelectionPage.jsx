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

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const data = await api.get('/orders/tables');
      setTables(data.tables || []);
      
      // If we already have a table and are changing it, pre-select it
      if (tableNumber) {
        setSelectedTable(tableNumber);
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
        onNavigate('auth-selection'); // Go to login or guest choice
    }
  };

  const groupedTables = tables.reduce((acc, table) => {
    const area = table.area_name || 'Main Hall';
    if (!acc[area]) acc[area] = [];
    acc[area].push(table);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-6 shadow-sm flex items-center gap-4 sticky top-0 z-20">
        <button 
          onClick={() => isChangingTable ? onNavigate('dashboard') : onNavigate('welcome')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isChangingTable ? 'Change Your Table' : 'Select Your Table'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="mb-6">
          <p className="text-gray-500">
            Please choose an available table to begin your dining experience.
          </p>
        </div>

        {Object.entries(groupedTables).map(([area, areaTables]) => (
          <div key={area} className="mb-10 last:mb-0">
            <div className="flex items-center gap-2 mb-4">
               <div className="w-1 h-6 bg-amber-400 rounded-full"></div>
               <h2 className="text-lg font-bold text-gray-800">{area}</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {areaTables.map((table) => {
                const isOccupied = table.status === 'not available' || table.status === 'occupied';
                const isSelected = selectedTable === table.table_number;
                
                return (
                  <button
                    key={table.id}
                    disabled={isOccupied}
                    onClick={() => setSelectedTable(table.table_number)}
                    className={`
                      relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center
                      ${isOccupied 
                        ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed' 
                        : isSelected
                          ? 'bg-amber-50 border-amber-500 shadow-md transform scale-[1.02]'
                          : 'bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50/10'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isSelected ? 'bg-amber-400 text-amber-900' : 'bg-gray-100 text-gray-500'}
                    `}>
                      <UtensilsIcon className="w-5 h-5" />
                    </div>
                    
                    <div>
                      <div className="font-bold text-gray-900">Table {table.table_number}</div>
                      <div className="text-xs text-gray-500">{table.capacity} Seats</div>
                    </div>

                    {isOccupied && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                    
                    {isSelected && !isOccupied && (
                       <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                          <CheckCircleIcon className="w-4 h-4" />
                       </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
