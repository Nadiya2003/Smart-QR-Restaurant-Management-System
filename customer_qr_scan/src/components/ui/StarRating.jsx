import React from 'react';
import { StarIcon } from 'lucide-react';

export function StarRating({
  rating,
  onRate,
  size = 'md',
  readonly = false
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate && onRate(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none`}
        >
          <StarIcon
            className={`${sizes[size]} ${star <= rating ? 'fill-gray-900 text-gray-900' : 'fill-gray-100 text-gray-200'}`}
          />
        </button>
      ))}
    </div>
  );
}
