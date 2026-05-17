import React, { useState } from 'react';
import { Star, X, MessageSquare, Send } from 'lucide-react';
import { submitInquiryReview } from '../../services/InquiryAPI';

const ModalRateService = ({ inquiry, onClose, onRefresh }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            alert("Please select a rating.");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitInquiryReview(inquiry.id, {
                rating,
                comment
            });
            alert("Thank you for your feedback!");
            onRefresh();
            onClose();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden relative animate-fade-in-up">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8 md:p-12 text-center">
                    <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-100">
                        <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />
                    </div>
                    
                    <h2 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter mb-2">Rate Our Service</h2>
                    <p className="text-gray-500 text-sm font-medium mb-8">How was your experience with our <span className="text-black font-bold capitalize">{inquiry.service_type?.replace('_', ' ')}</span>?</p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    className="relative group transition-transform hover:scale-125 focus:outline-none"
                                >
                                    <Star 
                                        className={`w-10 h-10 transition-colors duration-200 ${
                                            star <= (hover || rating) 
                                            ? 'text-yellow-400 fill-yellow-400 shadow-yellow-200' 
                                            : 'text-gray-200'
                                        }`}
                                    />
                                    {star <= (hover || rating) && (
                                        <span className="absolute -inset-1 bg-yellow-400/20 blur-xl rounded-full -z-10 animate-pulse"></span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <div className="absolute top-4 left-5 text-gray-300">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tell us more about the service quality..."
                                rows={4}
                                required
                                className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-yellow-400/10 focus:border-yellow-400 outline-none transition-all resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || rating === 0}
                            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Feedback
                                </>
                            )}
                        </button>
                        
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Your review will be visible on our landing page
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ModalRateService;
