import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { StarRating } from '../components/ui/StarRating';
import { Button } from '../components/ui/Button';
import { CheckCircleIcon } from 'lucide-react';

export function FeedbackPage({ onNavigate }) {
  const [mealRating, setMealRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // Mock submit
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <CheckCircleIcon className="w-20 h-20 text-gray-900 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-500 mb-8">
          Your feedback helps us improve our service.
        </p>
        <Button fullWidth onClick={() => onNavigate('welcome')}>
          Return to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        title="Rate Your Experience"
        showBack
        onBack={() => onNavigate('menu')}
        onNavigate={onNavigate}
      />

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">
            How was your meal?
          </h3>
          <div className="flex justify-center mb-6">
            <StarRating rating={mealRating} onRate={setMealRating} size="lg" />
          </div>

          <h3 className="font-semibold text-gray-900 mb-4 text-center border-t border-gray-100 pt-6">
            How was the service?
          </h3>
          <div className="flex justify-center mb-6">
            <StarRating
              rating={serviceRating}
              onRate={setServiceRating}
              size="lg"
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Any additional comments? (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you loved or what we can improve..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              rows={4}
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100 pb-safe">
        <Button
          fullWidth
          size="lg"
          disabled={mealRating === 0 || serviceRating === 0}
          onClick={handleSubmit}
        >
          Submit Feedback
        </Button>
      </div>
    </div>
  );
}
