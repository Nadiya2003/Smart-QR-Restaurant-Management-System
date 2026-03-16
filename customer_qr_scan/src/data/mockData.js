export const RESTAURANT_INFO = {
  name: "Melissa's Food Court",
  tableNumber: '05'
};

export const CATEGORIES = [
  { id: 'meals', name: 'Meals', icon: '🍽️' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
  { id: 'specials', name: 'Specials', icon: '✨' }
];

export const MENU_ITEMS = [
  {
    id: 'm1',
    name: 'Chicken Kottu',
    description: 'Sri Lankan chopped roti with chicken and vegetables',
    price: 1200,
    image: 'https://picsum.photos/seed/kottu/400/300',
    category: 'meals',
    isAvailable: true
  },
  {
    id: 'm2',
    name: 'Rice & Curry',
    description: 'Traditional rice served with dhal, chicken curry, and sambols',
    price: 950,
    image: 'https://picsum.photos/seed/ricecurry/400/300',
    category: 'meals',
    isAvailable: true
  },
  {
    id: 'm3',
    name: 'Lamprais',
    description: 'Dutch-Burgher rice parcel with frikkadels, ash plantain, and sambol',
    price: 1500,
    image: 'https://picsum.photos/seed/lamprais/400/300',
    category: 'meals',
    isAvailable: true
  },
  {
    id: 'm4',
    name: 'Egg Hoppers',
    description: 'Bowl-shaped rice flour pancakes with a soft egg center',
    price: 350,
    image: 'https://picsum.photos/seed/hoppers/400/300',
    category: 'meals',
    isAvailable: true
  },
  {
    id: 'm5',
    name: 'Devilled Prawns',
    description: 'Spicy stir-fried prawns with onions, peppers, and chili paste',
    price: 1800,
    image: 'https://picsum.photos/seed/prawns/400/300',
    category: 'meals',
    isAvailable: true
  },
  {
    id: 'd1',
    name: 'King Coconut',
    description: 'Fresh Sri Lankan king coconut water served chilled',
    price: 250,
    image: 'https://picsum.photos/seed/coconut/400/300',
    category: 'drinks',
    isAvailable: true
  },
  {
    id: 'd2',
    name: 'Faluda',
    description: 'Rose-flavored milk drink with basil seeds and ice cream',
    price: 450,
    image: 'https://picsum.photos/seed/faluda/400/300',
    category: 'drinks',
    isAvailable: true
  },
  {
    id: 'd3',
    name: 'Ceylon Tea',
    description: 'Premium Sri Lankan black tea with milk',
    price: 180,
    image: 'https://picsum.photos/seed/ceylontea/400/300',
    category: 'drinks',
    isAvailable: true
  },
  {
    id: 'ds1',
    name: 'Watalappan',
    description: 'Traditional coconut custard pudding with jaggery and cardamom',
    price: 550,
    image: 'https://picsum.photos/seed/watalappan/400/300',
    category: 'desserts',
    isAvailable: true
  },
  {
    id: 'ds2',
    name: 'Kavum',
    description: 'Deep-fried sweet oil cakes made with rice flour and treacle',
    price: 400,
    image: 'https://picsum.photos/seed/kavum/400/300',
    category: 'desserts',
    isAvailable: true
  },
  {
    id: 's1',
    name: 'Isso Vade',
    description: 'Crispy lentil fritters topped with spicy prawns',
    price: 750,
    image: 'https://picsum.photos/seed/issovade/400/300',
    category: 'specials',
    isAvailable: true
  },
  {
    id: 's2',
    name: 'Chef Special Seafood Platter',
    description: 'A curated selection of grilled and fried seafood',
    price: 2300,
    image: 'https://picsum.photos/seed/seafood/400/300',
    category: 'specials',
    isAvailable: true
  }
];

export const STEWARDS = [
  {
    id: 'st1',
    name: 'Kasun Perera',
    avatar: 'KP',
    shift: 'morning',
    rating: 4.8,
    isAvailable: true
  },
  {
    id: 'st2',
    name: 'Priya Fernando',
    avatar: 'PF',
    shift: 'morning',
    rating: 4.9,
    isAvailable: true
  },
  {
    id: 'st3',
    name: 'Nimal Silva',
    avatar: 'NS',
    shift: 'night',
    rating: 4.7,
    isAvailable: true
  },
  {
    id: 'st4',
    name: 'Chamari Jayawardena',
    avatar: 'CJ',
    shift: 'night',
    rating: 4.6,
    isAvailable: false
  },
  {
    id: 'st5',
    name: 'Dilshan Bandara',
    avatar: 'DB',
    shift: 'morning',
    rating: 5.0,
    isAvailable: true
  }
];

export const MOCK_ORDERS = [
  {
    id: 'ORD-1042',
    items: [
      { menuItem: MENU_ITEMS[0], quantity: 2 },
      { menuItem: MENU_ITEMS[5], quantity: 2 }
    ],
    status: 'served',
    stewardId: 'st1',
    tableNumber: '05',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    total: 2900
  },
  {
    id: 'ORD-0981',
    items: [
      { menuItem: MENU_ITEMS[2], quantity: 1 },
      { menuItem: MENU_ITEMS[8], quantity: 1 }
    ],
    status: 'served',
    stewardId: 'st2',
    tableNumber: '12',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    total: 2050
  }
];
