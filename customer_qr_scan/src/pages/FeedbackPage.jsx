import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { StarRating } from '../components/ui/StarRating';
import { Button } from '../components/ui/Button';
import { CheckCircleIcon, SendIcon } from 'lucide-react';
import { api } from '../utils/api';
import { useOrder } from '../hooks/useOrder';

export function FeedbackPage({ onNavigate, data }) {
  const { clearOrder } = useOrder();
  const [mealRating, setMealRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const orderId = data?.orderId;
  const stewardId = data?.stewardId;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Submit Steward/Service Rating (includes meal rating)
      await api.post('/customer/rate', {
          stewardId,
          rating: serviceRating,
          mealRating,
          comment: comment || `Order #${orderId} Feedback`,
          orderId
      });

      // Submit Restaurant/Meal Feedback (Optional enhancement: a separate endpoint if needed, but for now we link it)
      // If the backend handles both in one, great. For now we use the existing rate endpoint which updates steward.

      setSubmitted(true);
      await clearOrder(false); // Clear local state silently since DB is already COMPLETED
    } catch (err) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircleIcon className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-500 mb-10 font-medium">
          Your feedback helps us provide the finest Sri Lankan hospitality.
        </p>
        <Button 
            fullWidth 
            className="py-5 rounded-3xl font-black uppercase tracking-widest text-xs" 
            onClick={() => { clearOrder(true); onNavigate('welcome'); }}
        >
          Return to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        title="Rate Experience"
        showBack
        onBack={() => onNavigate('dashboard')}
        onNavigate={onNavigate}
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 mb-6">
          <div className="text-center mb-8">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[4px] mb-2 block">Your Opinion Matters</span>
              <h3 className="text-xl font-black text-gray-900">How was everything?</h3>
          </div>

          <div className="space-y-10">
              <div className="flex flex-col items-center">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Meal Quality</h4>
                <StarRating rating={mealRating} onRate={setMealRating} size="lg" />
              </div>

              <div className="flex flex-col items-center pt-6 border-t border-gray-50">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Service & Steward</h4>
                <StarRating
                  rating={serviceRating}
                  onRate={setServiceRating}
                  size="lg"
                />
              </div>

              <div className="pt-6 border-t border-gray-50">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Additional Comments
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you loved..."
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-gray-900 shadow-inner min-h-[120px]"
                />
              </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100 pb-safe">
        <Button
          fullWidth
          size="lg"
          className="py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-gray-200"
          disabled={mealRating === 0 || serviceRating === 0 || loading}
          onClick={handleSubmit}
        >
          {loading ? 'Submitting...' : 'Send Feedback'}
        </Button>
      </div>
    </div>
  );
}
