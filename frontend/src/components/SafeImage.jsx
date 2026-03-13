import { useState } from 'react';

/**
 * SafeImage Component - Handles broken image URLs with a default fallback
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text
 * @param {string} className - CSS classes
 * @param {string} fallbackSrc - Optional custom fallback image
 */
const SafeImage = ({ src, alt, className, fallbackSrc = 'https://via.placeholder.com/800x600?text=Melissas+Food+Court', ...props }) => {
    const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

    const handleError = () => {
        if (imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
        }
    };

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className || "w-full h-full object-cover"}
            onError={handleError}
            {...props}
        />
    );
};

export default SafeImage;
