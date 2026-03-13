import { useState, useEffect } from 'react';
import SafeImage from './SafeImage';

/**
 * Carousel Component - Auto-sliding photo carousel
 * Features:
 * - Auto-advance every 3 seconds
 * - Manual navigation with previous/next buttons
 * - Dot indicators for slide position
 * - Smooth transitions
 */
function Carousel({ images = [] }) {
    // Current slide index
    const [currentIndex, setCurrentIndex] = useState(0);

    // Default placeholder images if none provided
    const defaultImages = [
        { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200', alt: 'Restaurant Interior' },
        { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200', alt: 'Fusion Food Dishes' },
        { url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200', alt: 'Elegant Dining' },
        { url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=1200', alt: 'Professional Chef' },
        { url: 'https://images.unsplash.com/photo-1550966841-3ee296061849?auto=format&fit=crop&q=80&w=1200', alt: 'Happy Customers Dining' },
    ];

    const slides = images.length > 0 ? images : defaultImages;

    // Auto-advance carousel every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
        }, 5000);

        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, [slides.length]);

    // Go to previous slide
    const handlePrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex === 0 ? slides.length - 1 : prevIndex - 1));
    };

    // Go to next slide
    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    };

    // Go to specific slide
    const goToSlide = (index) => {
        setCurrentIndex(index);
    };

    return (
        <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden group shadow-2xl shadow-[#D4AF37]/10">
            {/* Slides */}
            {slides.map((slide, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                        }`}
                >
                    <SafeImage
                        src={slide.url}
                        alt={slide.alt}
                        className="w-full h-full object-cover"
                    />
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Caption */}
                    {index === currentIndex && (
                        <div className="absolute bottom-12 left-8 md:left-12 animate-slide-up">
                            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{slide.alt}</h3>
                            <div className="w-12 h-1 bg-[#D4AF37]"></div>
                        </div>
                    )}
                </div>
            ))}

            {/* Previous Button */}
            <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-[#D4AF37] backdrop-blur-md text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 border border-white/10 hover:border-white/50 z-10"
                aria-label="Previous slide"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Next Button */}
            <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-[#D4AF37] backdrop-blur-md text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 border border-white/10 hover:border-white/50 z-10"
                aria-label="Next slide"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`transition-all duration-300 rounded-full ${index === currentIndex ? 'bg-[#D4AF37] w-8 h-2' : 'bg-white/30 hover:bg-white/60 w-2 h-2'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    ></button>
                ))}
            </div>
        </div>
    );
}

export default Carousel;
