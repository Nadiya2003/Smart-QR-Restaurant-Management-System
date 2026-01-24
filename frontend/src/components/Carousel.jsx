import { useState, useEffect } from 'react';

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
        { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', alt: 'Restaurant Interior' },
        { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', alt: 'Fine Dining' },
        { url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800', alt: 'Delicious Food' },
    ];

    const slides = images.length > 0 ? images : defaultImages;

    // Auto-advance carousel every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
        }, 3000);

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
        <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden group">
            {/* Slides */}
            {slides.map((slide, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-700 ${index === currentIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    <img
                        src={slide.url}
                        alt={slide.alt}
                        className="w-full h-full object-cover"
                    />
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-black/30"></div>
                </div>
            ))}

            {/* Previous Button */}
            <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                aria-label="Previous slide"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Next Button */}
            <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                aria-label="Next slide"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-[#FF00FF] w-8' : 'bg-white/50 hover:bg-white/80'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    ></button>
                ))}
            </div>
        </div>
    );
}

export default Carousel;
