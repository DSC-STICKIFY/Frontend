import React, { useState, useEffect } from 'react';
import { IMAGE_BASE_URL } from '../../services/api';
import api from '../../services/api'; // your axios instance

// ---------- Image helpers ----------
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${IMAGE_BASE_URL}${clean}`;
};

const OrderImage = ({ src, alt, className = '' }) => {
  const [errored, setErrored] = useState(false);
  const url = getImageUrl(src);
  if (!url || errored) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
    );
  }
  return <img src={url} alt={alt} className={`${className} object-cover`} onError={() => setErrored(true)} />;
};

// ---------- Categories & reasons ----------
const CATEGORIES = [
  {
    id: 'damaged',
    label: 'Received Damaged Item(s)',
    sub: 'Physical/functional damages on Item',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v3l1.5-1 1.5 1V3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 13l2 2 5-5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18" />
      </svg>
    ),
    reasons: [
      { label: 'Damaged item', subReasons: ['Scratch/dents', 'Broken/cracked', 'Torn/ripped', 'Water damage', 'Other physical damage'] },
      { label: 'Product is defective or does not work', subReasons: ['Does not turn on', 'Missing parts/accessories', 'Not functioning as described', 'Manufacturing defect'] },
    ],
  },
  {
    id: 'incorrect',
    label: 'Received Incorrect Item(s)',
    sub: 'Wrong item, wrong size, counterfeit etc.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      </svg>
    ),
    reasons: [
      { label: 'Seller sent wrong item (e.g wrong size, model)', subReasons: [] },
      { label: 'Counterfeit product', subReasons: [] },
    ],
  },
  {
    id: 'missing',
    label: 'Did Not Receive Some/All of the Item(s)',
    sub: 'Some/all of my item(s) or accessories are not delivered',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3H8l-2 4h12l-2-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 13v3" />
      </svg>
    ),
    reasons: [
      { label: 'Parcel not delivered', subReasons: [] },
      { label: 'Missing part of the order', subReasons: [] },
      { label: 'Empty Parcel', subReasons: [] },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    sub: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
      </svg>
    ),
    reasons: [
      {
        label: 'I want to return item in original / sealed condition',
        subReasons: [],
        note: 'Return items in brand new condition and in original packaging. Sealed items must remain sealed and unopened.',
      },
    ],
  },
];

// ---------- Reusable bottom sheet wrapper ----------
const Sheet = ({ children, onBgClick }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4" onClick={onBgClick}>
    <div className="relative w-full sm:max-w-md animate-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

// ---------- Step 1: Category ----------
const StepCategory = ({ onSelect, onClose }) => (
  <Sheet onBgClick={onClose}>
    <div className="bg-white sm:rounded-[40px] rounded-t-[40px] overflow-hidden shadow-2xl border border-[#DCDCDC]">
      <div className="flex items-center gap-3 px-8 pt-8 pb-4">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-[#0B132A]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-black text-gray-900">Return Request</h2>
      </div>
      <div className="p-4 space-y-1">
        {CATEGORIES.map(cat => (
          <button key={cat.id} type="button" onClick={() => onSelect(cat)} className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl hover:bg-gray-50 transition text-left group border border-transparent hover:border-[#DCDCDC] shadow-sm hover:shadow-md">
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#FDE31E] text-black shadow-sm flex-shrink-0 group-hover:scale-105 transition">{cat.icon}</div>
            <div className="flex-1 min-w-0"><p className="font-black text-sm text-gray-900 uppercase tracking-tight">{cat.label}</p>{cat.sub && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{cat.sub}</p>}</div>
            <svg className="w-5 h-5 text-gray-300 flex-shrink-0 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        ))}
      </div>
      <div className="h-4" />
    </div>
  </Sheet>
);

// ---------- Step 2: Reason ----------
const StepReason = ({ category, selectedReason, selectedSubReason, onReasonChange, onSubReasonChange, onNext, onBack }) => {
  const [aR, setAR] = useState(selectedReason);
  const [aSub, setASub] = useState(selectedSubReason);
  const cur = category.reasons.find(r => r.label === aR);
  const ok = aR && (!cur?.subReasons?.length || aSub);

  return (
    <Sheet onBgClick={onBack}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">Select Reason</h3>
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"><svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 divide-y divide-gray-50">
          {category.reasons.map(r => (
            <div key={r.label}>
              <label className="flex items-start gap-3 py-3.5 cursor-pointer">
                <div onClick={() => { setAR(r.label); setASub(''); }} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition ${aR === r.label ? 'border-orange-500' : 'border-gray-300'}`}>{aR === r.label && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}</div>
                <div className="flex-1" onClick={() => { setAR(r.label); setASub(''); }}><p className="text-sm font-medium text-gray-900 leading-snug">{r.label}</p>{r.note && <p className="text-xs text-gray-500 mt-0.5">{r.note}</p>}</div>
              </label>
              {aR === r.label && r.subReasons?.length > 0 && (
                <div className="ml-8 mb-3 bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {r.subReasons.map(sub => (
                    <label key={sub} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-100 transition">
                      <div onClick={() => setASub(sub)} className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition ${aSub === sub ? 'border-orange-500' : 'border-gray-300'}`}>{aSub === sub && <div className="w-2 h-2 rounded-full bg-orange-500" />}</div>
                      <span className="text-sm text-gray-700" onClick={() => setASub(sub)}>{sub}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={() => { onReasonChange(aR); onSubReasonChange(aSub); onNext(); }} disabled={!ok}
            className="w-full py-3.5 font-semibold rounded-xl text-sm bg-[#FDE31E] hover:bg-yellow-400 text-black disabled:opacity-40 disabled:cursor-not-allowed transition">Next</button>
        </div>
      </div>
    </Sheet>
  );
};

// ---------- Step 3: Final Form ----------
const StepForm = ({ order, category, reason, subReason, onChangeReason, onClose, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [gcashNumber, setGcashNumber] = useState('');
  const [gcashError, setGcashError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ── Dynamic refund policy ──────────────────────────────────────────────────
  const [refundPct, setRefundPct] = useState(null);   // null = still loading
  const [policyError, setPolicyError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/settings/refund-policy')
      .then(res => {
        if (!cancelled) {
          const pct = parseFloat(res.data?.refund_percentage);
          setRefundPct(isNaN(pct) ? 70 : pct);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRefundPct(70); // graceful fallback
          setPolicyError(true);
        }
      });
    return () => { cancelled = true; };
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const displayReason = subReason || reason;

  const isCOD = !order.payment_method ||
    ['cod', 'cash on delivery', 'cash'].includes((order.payment_method || '').toLowerCase());

  const fullPrice = Number(order.total_price || 0);
  // Only compute once refundPct is loaded
  const refundAmt = refundPct !== null ? fullPrice * (refundPct / 100) : null;

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 6));
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files || []);
    setVideos(prev => [...prev, ...files].slice(0, 1));
  };

  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx));
  const removeVideo = () => setVideos([]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the problem.');
      return;
    }

    if (isCOD) {
      const cleanNumber = gcashNumber.trim().replace(/\s+/g, '');
      if (!cleanNumber) {
        setGcashError('GCash number is required for COD refunds.');
        return;
      }
      if (!/^(09|\+639)\d{9}$/.test(cleanNumber)) {
        setGcashError('Please enter a valid GCash number (e.g. 09171234567 or +639171234567)');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setGcashError('');

    try {
      const formData = new FormData();
      formData.append('order_id', order.order_id);
      const itemStatus = (order.status || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const itemHasTrackedStatus = ['to receive', 'completed'].includes(itemStatus);
      if (order.order_item_id && itemHasTrackedStatus) {
        formData.append('order_details_id', order.order_item_id);
      }
      formData.append('reason', `${category.label}: ${displayReason}`.substring(0, 255));
      formData.append('description', description.trim());
      if (isCOD && gcashNumber.trim()) {
        formData.append('gcash_number', gcashNumber.trim());
      }
      photos.forEach(f => formData.append('images[]', f));
      videos.forEach(f => formData.append('videos[]', f));

      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit return request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-gray-50 w-full sm:max-w-md sm:rounded-[40px] rounded-t-[40px] border border-[#DCDCDC] max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white px-8 pt-8 pb-5 flex items-center gap-3 z-10">
          <button onClick={onChangeReason} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-[#0B132A]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-black text-gray-900">Return Details</h2>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Product Card */}
          <div className="bg-white rounded-3xl border border-[#DCDCDC] shadow-sm transform transition-all hover:shadow-md">
            <div className="flex items-center gap-4 px-5 py-4">
              <OrderImage src={order.product_image} alt={order.product_name} className="w-16 h-16 rounded-2xl border border-[#DCDCDC] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 line-clamp-2 uppercase tracking-tight">{order.product_name}</p>
                {order.size && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Size: {order.size}</p>}
              </div>
              <span className="text-xs font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-[#DCDCDC]">x{order.quantity || 1}</span>
            </div>
          </div>

          {/* Reason */}
          <button type="button" onClick={onChangeReason}
            className="w-full bg-white rounded-2xl border border-[#DCDCDC] flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition text-left shadow-sm active:scale-95">
            <div className="flex items-center gap-1"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Reason</span><span className="text-red-500">*</span></div>
            <div className="flex items-center gap-3 max-w-[65%]">
              <div className="text-right">
                <p className="text-sm font-black text-gray-900 leading-snug">{displayReason}</p>
                <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">Solution: Return and Refund</p>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>

          {/* Description */}
          <div className="bg-white rounded-3xl border border-[#DCDCDC] p-6 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description <span className="text-red-500">*</span></span>
              <span className="text-[10px] font-bold text-gray-300">{description.length}/1000</span>
            </div>
            <textarea rows={4} maxLength={1000} placeholder="Provide details about the issue..." className="w-full text-sm border-0 resize-none focus:outline-none text-gray-900 font-medium placeholder:text-gray-300 bg-transparent" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Media Upload */}
          <div className="bg-white rounded-3xl border border-[#DCDCDC] p-6 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Evidence (Images/Videos)</p>
            <div className="flex flex-wrap gap-4">
              {photos.length < 6 && (
                <label className="cursor-pointer border-2 border-dashed border-[#DCDCDC] hover:border-[#FDE31E] hover:bg-yellow-50 w-20 h-20 rounded-2xl flex flex-col items-center justify-center transition-all group">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                  <span className="text-2xl group-hover:scale-110 transition">+</span>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 mt-0.5">Photo</span>
                </label>
              )}
              {videos.length === 0 && (
                <label className="cursor-pointer border-2 border-dashed border-[#DCDCDC] hover:border-[#FDE31E] hover:bg-yellow-50 w-20 h-20 rounded-2xl flex flex-col items-center justify-center transition-all group">
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                  <span className="text-2xl group-hover:scale-110 transition">🎥</span>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 mt-0.5">Video</span>
                </label>
              )}
              {photos.map((f, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover rounded-2xl border border-[#DCDCDC] shadow-sm" />
                  <button onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-sm flex items-center justify-center shadow-lg border-2 border-white scale-0 group-hover:scale-100 transition-all">×</button>
                </div>
              ))}
              {videos.map((f, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  <video src={URL.createObjectURL(f)} className="w-full h-full object-cover rounded-2xl border border-[#DCDCDC] shadow-sm" />
                  <button onClick={removeVideo} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-sm flex items-center justify-center shadow-lg border-2 border-white scale-0 group-hover:scale-100 transition-all">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Refund Policy Section (Dynamic) ─────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-[#DCDCDC] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Refund To</span>
              <span className="text-sm font-semibold text-gray-900">
                {isCOD ? 'GCash Wallet' : order.payment_method?.toLowerCase() === 'gcash' ? 'Original GCash' : order.payment_method || 'COD → GCash'}
              </span>
            </div>

            {/* Amounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Item subtotal</span>
                <span className="text-sm text-gray-400 line-through">
                  ₱{fullPrice.toLocaleString('en-PH')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Refund amount
                  {refundPct !== null && (
                    <span className="ml-1.5 text-[10px] font-black text-yellow-600 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full">
                      {refundPct}%
                    </span>
                  )}
                </span>

                {/* Loading skeleton while fetching */}
                {refundAmt === null ? (
                  <div className="h-7 w-24 bg-gray-100 rounded-xl animate-pulse" />
                ) : (
                  <span className="text-xl font-black text-[#FDE31E]">
                    ₱{refundAmt.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {/* Policy note — shown once loaded */}
              {refundPct !== null && (
                <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                  <p className="text-xs text-yellow-700 flex items-start gap-2">
                    <span className="text-sm mt-0.5">ℹ️</span>
                    <span>
                      Our refund policy covers <strong>{refundPct}%</strong> of the item price.
                      The remaining <strong>{100 - refundPct}%</strong> covers processing and restocking fees.
                    </span>
                  </p>
                </div>
              )}

              {/* Silent fallback notice if fetch failed */}
              {policyError && (
                <p className="text-[10px] text-gray-400 text-center">
                  Using default refund rate. Actual amount may vary.
                </p>
              )}
            </div>

            {/* GCash Input for COD */}
            {isCOD && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xl font-bold">₱</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">GCash Number <span className="text-red-500">*</span></p>
                    <p className="text-xs text-gray-500">
                      Where we will send your {refundPct !== null ? `${refundPct}%` : ''} refund
                    </p>
                  </div>
                </div>

                <input
                  type="tel"
                  value={gcashNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+]/g, '');
                    setGcashNumber(val);
                    setGcashError('');
                  }}
                  placeholder="09171234567"
                  maxLength={13}
                  className="w-full text-base border border-[#DCDCDC] rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 font-medium tracking-wider"
                />

                {gcashError && <p className="text-red-500 text-xs mt-2">{gcashError}</p>}

                <div className="mt-3 text-[10px] text-gray-400">
                  Accepted formats: 09171234567 or +639171234567
                </div>
              </div>
            )}

            {/* GCash original wallet */}
            {!isCOD && order.payment_method?.toLowerCase() === 'gcash' && (
              <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 01-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-700 leading-snug">
                  Refund will be automatically returned to your <span className="font-semibold">original GCash wallet</span>.
                </p>
              </div>
            )}

            {/* Other payment methods */}
            {!isCOD && order.payment_method?.toLowerCase() !== 'gcash' && (
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                Refund will be processed to your original payment method.
              </div>
            )}
          </div>
          {/* ────────────────────────────────────────────────────────────────── */}

          {error && <p className="text-red-500 text-sm text-center px-2">{error}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!description.trim() || submitting || refundAmt === null}
              className="w-full py-4 font-black rounded-2xl text-[13px] uppercase tracking-widest bg-[#FDE31E] hover:bg-yellow-400 text-black shadow-md  active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all"
            >
              {submitting ? 'Processing...' : refundAmt === null ? 'Loading…' : 'Submit Return Request'}
            </button>
          </div>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
};

// ---------- Main Modal ----------
const ReturnRefundModal = ({ order, onClose, onSubmit }) => {
  const [step, setStep] = useState('category');
  const [category, setCategory] = useState(null);
  const [reason, setReason] = useState('');
  const [subReason, setSubReason] = useState('');

  if (step === 'category')
    return <StepCategory onSelect={c => { setCategory(c); setReason(''); setSubReason(''); setStep('reason'); }} onClose={onClose} />;

  if (step === 'reason')
    return <StepReason
      category={category}
      selectedReason={reason}
      selectedSubReason={subReason}
      onReasonChange={setReason}
      onSubReasonChange={setSubReason}
      onNext={() => setStep('form')}
      onBack={() => setStep('category')}
    />;

  return <StepForm
    order={order}
    category={category}
    reason={reason}
    subReason={subReason}
    onChangeReason={() => setStep('reason')}
    onClose={onClose}
    onSubmit={onSubmit}
  />;
};

export default ReturnRefundModal;