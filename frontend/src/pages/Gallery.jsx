import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import SafeImage from '../components/SafeImage';

/**
 * Gallery Page - High-quality photo gallery
 * Features:
 * - Grid layout with hover effects
 * - Lightbox with navigation arrows
 * - Fullscreen preview
 * - Responsive design
 */
function Gallery() {
    const galleryImages = [
        { id: 1, src: '/artifacts/carousel_interior_1773389727502.png', category: 'Interior', title: 'Grand Dining Hall' },
        { id: 2, src: '/artifacts/gallery_dish_1_1773390449991.png', category: 'Food', title: 'Signature Rice & Curry' },
        { id: 3, src: '/artifacts/carousel_dining_tables_1773389760411.png', category: 'Interior', title: 'Window View' },
        { id: 4, src: '/artifacts/gallery_dish_2_1773390465706.png', category: 'Food', title: 'Seafood Fettuccine' },
        { id: 5, src: '/artifacts/gallery_interior_2_1773390480803.png', category: 'Interior', title: 'Garden Terrace' },
        { id: 6, src: '/artifacts/gallery_chef_2_1773390495869.png', category: 'Kitchen', title: 'The Art of Plating' },
        { id: 7, src: '/artifacts/carousel_food_dishes_1773389744131.png', category: 'Food', title: 'Sri Lankan Spices' },
        { id: 8, src: '/artifacts/carousel_chef_cooking_1773389776402.png', category: 'Kitchen', title: 'Open Kitchen' },
        { id: 9, src: '/artifacts/carousel_customer_dining_1773389791984.png', category: 'Interior', title: 'Cozy Moments' },
    ];

    const [selectedImage, setSelectedImage] = useState(null);

    const openLightbox = (image) => {
        setSelectedImage(image);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setSelectedImage(null);
        document.body.style.overflow = 'auto';
    };

    const navigateImage = (direction) => {
        const currentIndex = galleryImages.findIndex(img => img.id === selectedImage.id);
        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % galleryImages.length;
        } else {
            nextIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        }
        setSelectedImage(galleryImages[nextIndex]);
    };

    return (
        <div className="min-h-screen px-4 py-16">
            <div className="container mx-auto">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#E6C86E] to-[#D4AF37] text-transparent bg-clip-text mb-6">
                        Photo Gallery
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        A visual journey through the flavors and atmosphere of Melissas Food Court.
                    </p>
                </div>

                {/* Gallery Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                    {galleryImages.map((image) => (
                        <div 
                            key={image.id}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl aspect-[4/3] shadow-lg shadow-black/40"
                            onClick={() => openLightbox(image)}
                        >
                            <SafeImage 
                                src={image.src} 
                                alt={image.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                <div>
                                    <h3 className="text-xl font-bold text-[#D4AF37]">{image.title}</h3>
                                    <p className="text-[#D4AF37] text-xs uppercase tracking-widest font-bold mb-1">{image.category}</p>
                                    <p className="text-white text-sm">View Fullscreen</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lightbox */}
                {selectedImage && (
                    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fade-in" onClick={closeLightbox}>
                        {/* Close button */}
                        <button 
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[110]"
                            onClick={closeLightbox}
                        >
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Navigation Arrows */}
                        <button 
                            className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-[#D4AF37] text-white p-4 rounded-full transition-all z-[110]"
                            onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button 
                            className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-[#D4AF37] text-white p-4 rounded-full transition-all z-[110]"
                            onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Fullscreen Image Container */}
                        <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                            <SafeImage 
                                src={selectedImage.src} 
                                alt={selectedImage.title} 
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-[0_0_50px_rgba(212,175,55,0.2)] border border-white/10"
                            />
                            <div className="mt-8 text-center">
                                <p className="text-[#D4AF37] text-xs uppercase tracking-widest font-bold mb-2">{selectedImage.category}</p>
                                <h3 className="text-3xl font-bold text-white mb-2">{selectedImage.title}</h3>
                                <p className="text-gray-400">Image {galleryImages.findIndex(i => i.id === selectedImage.id) + 1} of {galleryImages.length}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Gallery;
