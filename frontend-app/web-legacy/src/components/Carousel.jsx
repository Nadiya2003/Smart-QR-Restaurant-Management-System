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
        { url: 'https://scontent-sin2-2.xx.fbcdn.net/v/t39.30808-6/474970905_465201853312735_2141540770777892007_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=86c6b0&_nc_ohc=wrHRorrJtcMQ7kNvwGt1m5z&_nc_oc=AdnzrS9m35W-fxNjvk69pUIFFx3ZYeBROm9Gd1zleHfXlHRB2Zv8fw8fLB3hl1LYz1U&_nc_zt=23&_nc_ht=scontent-sin2-2.xx&_nc_gid=7FyMBY0eQPjavIMSRgp59g&oh=00_Afpu4_OVU9n2-oq2LI4rBbRw3AZ4IKH7iJpV9pjatgnMfw&oe=697D5843', alt: 'Restaurant Interior' },
        { url: 'https://scontent-sin6-1.xx.fbcdn.net/v/t39.30808-6/472229773_451774077983091_2739846528579957045_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=5f3xgvoLWj8Q7kNvwFXHqzX&_nc_oc=AdlCIQr5hecmPnhnj4WvDQJlP-2kMSFi5VxjavxTSPlF1LVjcMIoTmeTXIDp68h0lBA&_nc_zt=23&_nc_ht=scontent-sin6-1.xx&_nc_gid=eTCa-auTBNa5L0B_ytkHnw&oh=00_AfrqeDn1eNINC_ujGncUJ9qsujk39-YmY_hpHxJew8lDSQ&oe=697D6609', alt: 'Fine Dining' },
        { url: 'https://ceylonpages.lk/wp-content/uploads/2025/03/Melissas-Food-Court1jpg_gallery_518026-1024x576.jpeg', alt: 'Delicious Food' },
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
