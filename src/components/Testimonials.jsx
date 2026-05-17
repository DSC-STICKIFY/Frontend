import React, { useState, useEffect, useRef } from 'react';
import api, { getImageUrl } from '../services/api';

// ── Star component ────────────────────────────────────────────────────────────
const Stars = ({ rating = 5 }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(s => (
            <svg
                key={s}
                className={`w-5 h-5 ${s <= rating ? 'text-[#FFC700]' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
        ))}
    </div>
);

// ── Avatar with initials fallback ─────────────────────────────────────────────
const Avatar = ({ src, name }) => {
    const [imgError, setImgError] = useState(false);
    const initials = (name || 'A')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Deterministic pastel color based on name
    const colors = [
        'bg-yellow-100 text-yellow-700',
        'bg-blue-100 text-blue-700',
        'bg-green-100 text-green-700',
        'bg-purple-100 text-purple-700',
        'bg-pink-100 text-pink-700',
        'bg-orange-100 text-orange-700',
    ];
    const colorClass = colors[(name?.charCodeAt(0) || 0) % colors.length];

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={name}
                onError={() => setImgError(true)}
                loading="lazy"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#FDE31E] flex-shrink-0"
            />
        );
    }

    return (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 border-[#FDE31E] flex-shrink-0 ${colorClass}`}>
            {initials}
        </div>
    );
};

// ── Helper: resolve user profile image from any known field name ──────────────
const resolveProfileImage = (user) => {
    if (!user) return null;

    // Try all possible field names the backend might return
    const raw =
        user.profile_image  ||   // CustomerAccountSettings uses this
        user.profile_photo  ||   // old field name
        user.avatar         ||
        user.photo          ||
        null;

    if (!raw) return null;

    // If it's already a full URL, return as-is
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

    // Otherwise build using getImageUrl (handles /storage/ prefix)
    return getImageUrl(raw);
};

// ── Testimonial Card ──────────────────────────────────────────────────────────
const TestimonialCard = ({ testimonial: t }) => {
    const [imgErr, setImgErr] = React.useState(false);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-[#FDE31E]/40 transition-all duration-300 flex flex-col overflow-hidden h-full">

            {/* Product image banner */}
            {t.product_image && !imgErr ? (
                <div className="relative h-36 bg-gray-50 overflow-hidden">
                    <img
                        src={t.product_image}
                        alt={t.product_name || 'Product'}
                        onError={() => setImgErr(true)}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {/* Rating badge on the image */}
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-md">
                        <Stars rating={t.rating} />
                    </div>
                </div>
            ) : (
                <div className="px-5 pt-5">
                    <Stars rating={t.rating} />
                </div>
            )}

            {/* Card body */}
            <div className="flex flex-col gap-4 p-5 flex-grow">

                {/* Quote */}
                <p className="text-gray-600 text-sm leading-relaxed flex-grow line-clamp-4">
                    "{t.text}"
                </p>

                {/* Multi-way ratings details (Artist & Rider) */}
                {(t.artist_rating || t.rider_rating) && (
                    <div className="bg-gray-50 rounded-xl p-3.5 space-y-3.5 border border-gray-100/50 text-xs">
                        {t.artist_rating ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 text-[9px] uppercase tracking-widest flex items-center gap-1">🎨 Artist</span>
                                    <Stars rating={t.artist_rating} />
                                </div>
                                {t.artist_comment && (
                                    <p className="text-gray-600 italic font-bold">"{t.artist_comment}"</p>
                                )}
                            </div>
                        ) : null}
                        {t.rider_rating ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 text-[9px] uppercase tracking-widest flex items-center gap-1">🚚 Rider</span>
                                    <Stars rating={t.rider_rating} />
                                </div>
                                {t.rider_comment && (
                                    <p className="text-gray-600 italic font-bold">"{t.rider_comment}"</p>
                                )}
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Product chip */}
                {t.product_name && (
                    <div className="flex items-center gap-1.5 bg-[#FDE31E]/10 border border-[#FDE31E]/30 rounded-full px-3 py-1 self-start max-w-full">
                        <svg className="w-3 h-3 text-[#b89e00] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="text-[11px] font-semibold text-[#b89e00] truncate">{t.product_name}</span>
                    </div>
                )}

                {/* Divider */}
                <div className="h-px bg-gray-100" />

                {/* Author */}
                <div className="flex items-center gap-3">
                    <Avatar src={t.img} name={t.name} />
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                        <p className="text-[11px] text-gray-400">Verified Customer</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4 animate-pulse">
        <div className="flex gap-1">
            {[...Array(5)].map((_, i) => <div key={i} className="w-4 h-4 rounded-full bg-gray-100" />)}
        </div>
        <div className="space-y-2 flex-grow">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/6" />
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-2.5 bg-gray-100 rounded w-32" />
            </div>
        </div>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const Testimonials = () => {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(3);
    const [isPaused, setIsPaused]         = useState(false);
    const timerRef = useRef(null);

    // ── Fetch reviews ─────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const response = await api.get('/reviews');
                const result   = response.data;
                const data     = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);

                const mapped = data
                    .filter(r => r.comment || r.review_text)
                    .map(review => ({
                        id:   review.id,
                        text: review.comment || review.review_text || '',
                        name:
                            review.user?.name ||
                            [review.user?.first_name, review.user?.last_name].filter(Boolean).join(' ') ||
                            'Anonymous',
                        // ✅ FIX: try all possible profile image field names
                        img: resolveProfileImage(review.user),
                        rating:       Number(review.rating) || 5,
                        artist_rating:  review.artist_rating,
                        artist_comment: review.artist_comment,
                        rider_rating:   review.rider_rating,
                        rider_comment:  review.rider_comment,
                        product_name:
                            review.product?.product_name ||
                            (review.inquiry ? review.inquiry.service_type?.replace('_', ' ') : null) ||
                            review.product_name ||
                            null,
                        product_image:
                            review.product?.product_image
                                ? getImageUrl(review.product.product_image)
                                : review.inquiry?.image
                                ? getImageUrl(review.inquiry.image)
                                : null,
                    }));

                setTestimonials(mapped);
            } catch (err) {
                console.error('Error fetching reviews:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    // ── Responsive ────────────────────────────────────────────────────────────
    useEffect(() => {
        const update = () => {
            if (window.innerWidth < 640)       setItemsPerPage(1);
            else if (window.innerWidth < 1024) setItemsPerPage(2);
            else                               setItemsPerPage(3);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // ── Auto-slide ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isPaused || loading || testimonials.length <= itemsPerPage) return;
        timerRef.current = setInterval(() => {
            setCurrentIndex(prev =>
                prev + 1 >= testimonials.length - itemsPerPage + 1 ? 0 : prev + 1
            );
        }, 4000);
        return () => clearInterval(timerRef.current);
    }, [isPaused, loading, testimonials.length, itemsPerPage]);

    const maxIndex  = Math.max(0, testimonials.length - itemsPerPage);
    const totalDots = maxIndex + 1;

    const prev = () => setCurrentIndex(i => (i === 0 ? maxIndex : i - 1));
    const next = () => setCurrentIndex(i => (i >= maxIndex ? 0 : i + 1));

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <section className="bg-[#F1F3F7] py-16 px-4 sm:px-6 md:px-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                        <div className="h-6 w-48 bg-gray-200 rounded-full mx-auto animate-pulse" />
                        <div className="h-4 w-64 bg-gray-100 rounded-full mx-auto mt-3 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                </div>
            </section>
        );
    }

    if (testimonials.length === 0) return null;

    return (
        <section
            className="bg-[#F1F3F7] py-16 px-4 sm:px-6 md:px-10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="text-center mb-10">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#b89e00] bg-[#FDE31E]/20 px-3 py-1 rounded-full mb-3">
                        Customer Reviews
                    </span>
                    <h2 style={{ fontFamily: 'Holtwood One SC, serif' }} className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-wide">
                        What Our Customers Say
                    </h2>
                    <p className="text-gray-500 text-sm mt-2">Real feedback from our happy customers</p>
                </div>

                {/* Carousel wrapper */}
                <div className="relative">
                    {/* Prev button */}
                    {testimonials.length > itemsPerPage && (
                        <button
                            onClick={prev}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-6 z-10 w-9 h-9 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:bg-[#FDE31E] hover:border-[#FDE31E] transition-all"
                        >
                            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                    )}

                    {/* Sliding track */}
                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)` }}
                        >
                            {testimonials.map(t => (
                                <div
                                    key={t.id}
                                    className="flex-shrink-0 px-2.5"
                                    style={{ width: `${100 / itemsPerPage}%` }}
                                >
                                    <TestimonialCard testimonial={t} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Next button */}
                    {testimonials.length > itemsPerPage && (
                        <button
                            onClick={next}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 z-10 w-9 h-9 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center hover:bg-[#FDE31E] hover:border-[#FDE31E] transition-all"
                        >
                            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Dots */}
                {totalDots > 1 && (
                    <div className="flex justify-center mt-8 gap-2">
                        {Array.from({ length: totalDots }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    currentIndex === i
                                        ? 'w-6 bg-[#FDE31E]'
                                        : 'w-2 bg-gray-300 hover:bg-gray-400'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Testimonials;