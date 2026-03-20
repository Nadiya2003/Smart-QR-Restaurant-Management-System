import { useState, useEffect, useCallback } from 'react';
import SafeImage from './SafeImage';

/**
 * Modern Carousel Component - Premium auto-sliding photo carousel
 * Features:
 * - Ken Burns Zoom Effect (slow zoom-in)
 * - Parallax-like Fade Transitions
 * - Modern Glassmorphism Controls
 * - Rich Overlay with Title & Description
 * - Dynamic Progress Indicators
 */
function Carousel({ images = [] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    const defaultImages = [
        { 
            url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200', 
            title: 'Luxury Dining',
            desc: 'The perfect ambiance for your special moments'
        },
        { 
            url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200', 
            title: 'Fusion Classics',
            desc: 'Where heritage meets modern culinary art'
        },
        { 
            url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200', 
            title: 'Authentic Spices',
            desc: 'Savor the depth of traditional Sri Lankan flavors'
        }
    ];

    const slides = images.length > 0 ? images.map(img => ({
        ...img,
        title: img.title || img.alt || 'Melissa\'s Signature',
        desc: img.desc || 'Experience culinary excellence'
    })) : defaultImages;

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, [slides.length]);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
        setIsAutoPlaying(false);
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
        setIsAutoPlaying(false);
    };

    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(handleNext, 8000); // Slower, more elegant timing
        return () => clearInterval(interval);
    }, [isAutoPlaying, handleNext]);

    return (
        <div 
            className="relative w-full h-[400px] md:h-[600px] rounded-2xl md:rounded-3xl overflow-hidden group shadow-2xl shadow-black/50"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
        >
            {/* Slides Container */}
            <div className="absolute inset-0 flex">
                {slides.map((slide, index) => {
                    const isActive = index === currentIndex;
                    return (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${
                                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                        >
                            {/* Ken Burns Animation Image Wrapper */}
                            <div className={`w-full h-full transition-transform duration-[12000ms] ease-linear overflow-hidden ${
                                isActive ? 'scale-125' : 'scale-100'
                            }`}>
                                <SafeImage
                                    src={slide.url}
                                    alt={slide.title}
                                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                                />
                            </div>

                            {/* Deep Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block"></div>

                            {/* Content */}
                            <div className={`absolute bottom-0 left-0 w-full p-8 md:p-16 transition-all duration-1000 transform ${
                                isActive ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                            }`}>
                                <div className="max-w-3xl space-y-4">
                                    <span className="inline-block px-3 py-1 bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] md:text-sm font-bold uppercase tracking-[0.2em] rounded-full backdrop-blur-sm">
                                        Signature Collection
                                    </span>
                                    <h3 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                                        {slide.title}
                                    </h3>
                                    <p className="text-gray-300 text-lg md:text-xl max-w-xl font-light leading-relaxed">
                                        {slide.desc}
                                    </p>
                                    <div className="pt-2">
                                        <div className="w-24 h-1 bg-gradient-to-r from-[#D4AF37] to-transparent rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Typography Controls - Left */}
            <button
                onClick={handlePrevious}
                className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center group/btn opacity-0 group-hover:opacity-100 transition-all duration-500 z-20"
            >
                <span className="text-[10px] tracking-[0.4em] text-[#D4AF37] font-bold mb-1 opacity-50 group-hover/btn:opacity-100 transition-opacity uppercase">PREV</span>
                <div className="w-12 h-[1px] bg-white/20 group-hover/btn:bg-[#D4AF37] transition-all duration-500"></div>
            </button>

            {/* Typography Controls - Right */}
            <button
                onClick={handleNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center group/btn opacity-0 group-hover:opacity-100 transition-all duration-500 z-20"
            >
                <span className="text-[10px] tracking-[0.4em] text-[#D4AF37] font-bold mb-1 opacity-50 group-hover/btn:opacity-100 transition-opacity uppercase">NEXT</span>
                <div className="w-12 h-[1px] bg-white/20 group-hover/btn:bg-[#D4AF37] transition-all duration-500"></div>
            </button>

            {/* Modern Pagination Dots (Vertical-inspired) */}
            <div className="absolute bottom-10 right-10 flex gap-4 z-20">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className="group relative h-8 w-2 flex items-center justify-center"
                    >
                        <div className={`transition-all duration-700 rounded-full bg-white ${
                            index === currentIndex 
                                ? 'h-full bg-[#D4AF37] w-[4px]' 
                                : 'h-2 w-[2px] opacity-20 group-hover:opacity-50 group-hover:h-4'
                        }`}></div>
                        {index === currentIndex && (
                            <div className="absolute inset-0 bg-[#D4AF37]/20 blur-md rounded-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Progress Bar (at top) */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-white/10 z-30">
                <div 
                    className="h-full bg-[#D4AF37] transition-all duration-[8000ms] ease-linear"
                    key={currentIndex}
                    style={{ width: isAutoPlaying ? '100%' : '0%' }}
                ></div>
            </div>
        </div>
    );
}

export default Carousel;

