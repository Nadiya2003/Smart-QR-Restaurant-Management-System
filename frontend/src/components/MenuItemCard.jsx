import SafeImage from './SafeImage';
import Button from './Button';
import config from '../config';

/**
 * MenuItemCard Component - Display food item with image, details, and add to cart
 * Used in the Menu page to show individual food items
 */
function MenuItemCard({ item, onAddToCart }) {
    return (
        <div className="glass-card p-0 overflow-hidden hover:scale-105 transition-transform duration-300">
            {/* Food Image */}
            <div className="h-48 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden">
                <SafeImage 
                    src={item.image ? (item.image.startsWith('http') ? item.image : (item.image.startsWith('/') ? `${config.API_BASE_URL}${item.image}` : `${config.API_BASE_URL}/food/${item.image}`)) : '/food/placeholder.png'} 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                />
            </div>

            {/* Card Content */}
            <div className="p-4">
                {/* Name */}
                <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.description}</p>

                {/* Price and Button */}
                <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#D4AF37]">Rs. {Number(item.price || 0).toLocaleString()}</span>
                    <Button onClick={() => onAddToCart(item)} size="sm" variant="primary">
                        Add to Cart
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default MenuItemCard;
