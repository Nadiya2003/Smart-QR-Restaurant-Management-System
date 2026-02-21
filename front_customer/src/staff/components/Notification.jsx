import React from 'react';
import GlassCard from './GlassCard';

/**
 * Notification - Displays individual notification with icon and actions
 */
const Notification = ({ notification, onMarkRead }) => {
    const getIcon = (type) => {
        const icons = {
            order_created: '🛎️',
            order_updated: '📦',
            table_assigned: '🪑',
            inventory_low: '⚠️',
            payment_received: '💰',
            supplier_order: '🚚',
            general: '📢',
        };
        return icons[type] || '📢';
    };

    const getTypeColor = (type) => {
        const colors = {
            order_created: 'text-blue-400',
            order_updated: 'text-purple-400',
            table_assigned: 'text-green-400',
            inventory_low: 'text-yellow-400',
            payment_received: 'text-[#FFD700]',
            supplier_order: 'text-orange-400',
            general: 'text-gray-400',
        };
        return colors[type] || 'text-gray-400';
    };

    return (
        <GlassCard
            className={`mb-3 ${notification.is_read ? 'opacity-60' : ''}`}
            hover={!notification.is_read}
        >
            <div className="flex items-start gap-4">
                <div className="text-3xl">{getIcon(notification.notification_type)}</div>
                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className={`font-semibold ${getTypeColor(notification.notification_type)}`}>
                                {notification.title}
                            </h4>
                            <p className="text-white/70 text-sm mt-1">{notification.message}</p>
                            <p className="text-white/40 text-xs mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                            </p>
                        </div>
                        {!notification.is_read && (
                            <button
                                onClick={() => onMarkRead(notification.id)}
                                className="text-[#FFD700] hover:text-[#FFA500] text-sm px-3 py-1 rounded-lg hover:bg-white/5 transition-all"
                            >
                                Mark Read
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

export default Notification;
