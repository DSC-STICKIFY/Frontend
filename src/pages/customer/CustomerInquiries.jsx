import React, { useState, useEffect } from 'react';
import { getCustomerInquiries, acceptQuotation, declineQuotation, payInquiryGcash, payInquiryOnsite } from '../../services/InquiryAPI';
import { format } from 'date-fns';
import { Search, Eye, Clock, MessageSquare, Tag, Star, X, CheckCircle, XCircle, CreditCard, Banknote, Sparkles } from 'lucide-react';
import ModalRateService from '../../components/modals/ModalRateService';

/* ─── Status config ───────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending:     { color: '#F59E0B', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400'   },
  reviewed:    { color: '#3B82F6', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-400'    },
  quoted:      { color: '#8B5CF6', bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200', dot: 'bg-violet-400'  },
  approved:    { color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-400' },
  in_progress: { color: '#06B6D4', bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',   dot: 'bg-cyan-400'    },
  completed:   { color: '#059669', bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-400'   },
  rejected:    { color: '#EF4444', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-400'     },
};
const getStatus = (s) => STATUS_CONFIG[s?.toLowerCase()] || { color: '#6B7280', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' };

/* ─── Star display (read-only) ────────────────────────────────────────── */
const StarDisplay = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(n => (
      <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
    ))}
  </div>
);

/* ─── Progress Timeline ───────────────────────────────────────────────── */
const STEPS = [
  { key: 'pending',     label: 'Pending'     },
  { key: 'reviewed',   label: 'Reviewed'    },
  { key: 'quoted',     label: 'Quoted'      },
  { key: 'approved',   label: 'Approved'    },
  { key: 'scheduled',  label: 'Scheduled'   },
  { key: 'in_progress',label: 'In Progress' },
  { key: 'completed',  label: 'Completed'   },
];

const ProgressTimeline = ({ currentStatus }) => {
  const currentIndex = STEPS.findIndex(s => s.key === currentStatus?.toLowerCase());
  const pct = currentIndex <= 0 ? 0 : (currentIndex / (STEPS.length - 1)) * 100;
  return (
    <div className="w-full py-6 mb-8">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 top-[7px] w-full h-[2px] bg-gray-100 rounded-full" />
        <div className="absolute left-0 top-[7px] h-[2px] bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        {STEPS.map((step, i) => {
          const done = i < currentIndex, current = i === currentIndex;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 z-10">
              <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500
                ${done    ? 'bg-yellow-400 border-yellow-400' : ''}
                ${current ? 'bg-white border-yellow-400 scale-125 shadow-[0_0_0_4px_rgba(251,191,36,0.15)]' : ''}
                ${!done && !current ? 'bg-white border-gray-200' : ''}`}
              />
              <span className={`text-[9px] font-black uppercase tracking-widest leading-none text-center w-12 ${current ? 'text-yellow-500' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Inquiry Card ────────────────────────────────────────────────────── */
const InquiryCard = ({ inquiry, onView, onRate }) => {
  const s = getStatus(inquiry.status);
  const isCompleted  = inquiry.status === 'completed';
  const hasRated     = !!inquiry.review;
  const needsRating  = isCompleted && !hasRated;

  return (
    <div className={`group bg-white rounded-[28px] border shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 overflow-hidden flex flex-col
      ${needsRating ? 'border-yellow-200 ring-2 ring-yellow-100' : 'border-gray-100'}`}
    >
      {/* Image strip or colour bar */}
      {inquiry.image ? (
        <div className="h-40 overflow-hidden relative">
          <img src={`http://localhost:8000/storage/${inquiry.image}`} alt="Design"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className={`absolute top-4 left-4 flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border} border px-3 py-1 rounded-full`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{inquiry.status?.replace('_', ' ')}</span>
          </div>
        </div>
      ) : (
        <div className="h-2 w-full" style={{ background: s.color }} />
      )}

      <div className="p-6 flex flex-col flex-1">
        {!inquiry.image && (
          <div className={`self-start flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border} border px-3 py-1 rounded-full mb-4`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{inquiry.status?.replace('_', ' ')}</span>
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-base font-black text-gray-900 capitalize leading-tight">
              {inquiry.service_type?.replace(/_/g, ' ')}
            </h3>
            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest flex-shrink-0">#{inquiry.id}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(inquiry.created_at), 'MMM dd, yyyy')}</span>
          </div>

          {inquiry.quotation_amount && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 mb-4">
              <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Quoted Amount</p>
                <p className="text-sm font-black text-emerald-700">₱{parseFloat(inquiry.quotation_amount).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* ── Already rated ── */}
          {isCompleted && hasRated && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-2.5 mb-4">
              <div className="flex flex-col gap-1">
                <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Your Rating</p>
                <StarDisplay rating={inquiry.review?.rating || 5} />
              </div>
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-col gap-2 mt-3">
          {needsRating && (
            <button
              onClick={(e) => { e.stopPropagation(); onRate(inquiry); }}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Star className="w-3.5 h-3.5 fill-black" />
              Rate This Service
            </button>
          )}
          <button
            onClick={() => onView(inquiry)}
            className="w-full py-3 text-white bg-gray-900 hover:bg-black rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Detail Modal ────────────────────────────────────────────────────── */
const DetailModal = ({ inquiry, onClose, onAccept, onDecline, onPayGcash, onPayOnsite, onRate }) => {
  const s = getStatus(inquiry.status);
  const isCompleted = inquiry.status === 'completed';
  const hasRated    = !!inquiry.review;
  const needsRating = isCompleted && !hasRated;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="bg-white rounded-[40px] w-full max-w-5xl flex flex-col overflow-hidden shadow-2xl"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-10 pt-10 pb-6 border-b border-gray-50 flex-shrink-0">
          <div>
            <div className={`inline-flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border} border px-4 py-1.5 rounded-full mb-3`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{inquiry.status?.replace(/_/g, ' ')}</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight capitalize">
              {inquiry.service_type?.replace(/_/g, ' ')}
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Inquiry #{inquiry.id}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500 hover:text-black flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0 px-10 py-8">
          <ProgressTimeline currentStatus={inquiry.status} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left col */}
            <div className="space-y-8">
              {inquiry.image && (
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 italic">Submitted Design</p>
                  <div className="rounded-[24px] overflow-hidden border border-gray-100 shadow-inner group">
                    <img src={`http://localhost:8000/storage/${inquiry.image}`}
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Design" />
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 italic">Service Details</p>
                <div className="bg-gray-50 rounded-[24px] p-6 space-y-3">
                  {[
                    ['Vehicle Type',   inquiry.car_type],
                    ['Wrap Type',      inquiry.wrap_type],
                    ['Decal Type',     inquiry.decal_type],
                    ['Finish Type',    inquiry.finish_type],
                    ['Placement',      inquiry.placement],
                    ['Estimated Size', inquiry.size],
                  ].filter(([,v]) => v).map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs font-bold text-gray-800 capitalize">{val}</span>
                    </div>
                  ))}
                  {inquiry.schedule_date && (
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">Scheduled Date</span>
                      <span className="text-xs font-bold text-yellow-600">{format(new Date(inquiry.schedule_date), 'MMM dd, yyyy – p')}</span>
                    </div>
                  )}
                  {inquiry.payment_status && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Payment Status</span>
                      <span className={`text-xs font-black uppercase ${inquiry.payment_status === 'paid' ? 'text-emerald-500' : 'text-red-400'}`}>{inquiry.payment_status}</span>
                    </div>
                  )}
                  {inquiry.amount_paid > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Amount Paid</span>
                      <span className="text-xs font-bold text-emerald-600">₱{parseFloat(inquiry.amount_paid).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 italic">Your Message</p>
                <div className="bg-white border-2 border-gray-100 rounded-[24px] p-6 text-sm text-gray-600 leading-relaxed italic">
                  "{inquiry.message || 'No additional notes provided.'}"
                </div>
              </div>

              {/* ── Rating section (inside modal) ── */}
              {isCompleted && (
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 italic">Your Review</p>
                  {hasRated ? (
                    <div className="bg-yellow-50 border-2 border-yellow-100 rounded-[24px] p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <StarDisplay rating={inquiry.review?.rating || 5} />
                        <span className="text-xs font-black text-yellow-700 uppercase tracking-widest">
                          {inquiry.review?.rating}/5
                        </span>
                      </div>
                      {inquiry.review?.comment && (
                        <p className="text-sm text-gray-600 italic leading-relaxed">
                          "{inquiry.review.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-yellow-400 to-yellow-300 rounded-[24px] p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-black/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Star className="w-5 h-5 text-black fill-black" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-black uppercase tracking-tight leading-none">How was your experience?</p>
                          <p className="text-[10px] text-black/60 font-bold mt-0.5">Your feedback helps us improve</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { onClose(); onRate(inquiry); }}
                        className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                      >
                        <Star className="w-4 h-4 fill-white" />
                        Leave a Review
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right col */}
            <div className="space-y-6">
              {/* Quotation card */}
              <div className="bg-gray-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/10 rounded-full -ml-12 -mb-12" />
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 italic">Quotation Result</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-yellow-400">₱</span>
                  <span className="text-6xl font-black tracking-tighter italic leading-none">
                    {inquiry.quotation_amount ? parseFloat(inquiry.quotation_amount).toLocaleString() : '—'}
                  </span>
                </div>
                {inquiry.downpayment_amount > 0 && inquiry.amount_paid < inquiry.downpayment_amount && (
                  <div className="mt-4 p-4 bg-white/10 rounded-2xl border border-white/20">
                    <p className="text-[9px] text-gray-400 uppercase font-black mb-1">Downpayment Required</p>
                    <p className="text-xl font-black text-yellow-400 italic">₱{parseFloat(inquiry.downpayment_amount).toLocaleString()}</p>
                  </div>
                )}
                <p className="text-[9px] text-gray-500 uppercase font-black mt-3">Estimated price based on requirements</p>
              </div>

              {inquiry.admin_message && (
                <div className="bg-amber-50 border-2 border-amber-100 rounded-[24px] p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-[0.2em] italic">Admin Response</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{inquiry.admin_message}</p>
                </div>
              )}

              {inquiry.status === 'rejected' && inquiry.rejection_reason && (
                <div className="bg-red-50 border-2 border-red-100 rounded-[24px] p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <p className="text-[9px] font-black text-red-700 uppercase tracking-[0.2em] italic">Rejection Reason</p>
                  </div>
                  <p className="text-sm text-red-700 leading-relaxed italic">"{inquiry.rejection_reason}"</p>
                </div>
              )}

              {(inquiry.payment_status === 'paid' || inquiry.payment_status === 'pay_onsite') && (
                <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[24px] p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em] italic">Payment Confirmed</p>
                  </div>
                  {[
                    ['Method',    inquiry.payment_method?.replace(/_/g, ' ')],
                    ['Status',    inquiry.payment_status?.replace(/_/g, ' ')],
                    ['Reference', inquiry.payment_reference],
                  ].filter(([,v]) => v).map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">{label}</span>
                      <span className="text-xs font-bold text-gray-700 capitalize">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-2">
                {inquiry.status === 'quoted' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => onAccept(inquiry.id)}
                      className="py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Accept
                    </button>
                    <button onClick={() => onDecline(inquiry.id)}
                      className="py-5 bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" /> Decline
                    </button>
                  </div>
                )}

                {inquiry.status === 'approved' && inquiry.payment_status === 'unpaid' && (
                  <div className="bg-blue-50 border-2 border-blue-100 rounded-[24px] p-6">
                    <p className="text-[9px] font-black text-blue-700 uppercase tracking-[0.2em] mb-4 text-center italic">Complete Your Payment</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => onPayGcash(inquiry.id)}
                        className="py-4 bg-[#FFE100] hover:bg-yellow-400 text-black rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-sm">
                        <CreditCard className="w-4 h-4" />
                        {inquiry.downpayment_amount > 0 && inquiry.amount_paid == 0 ? 'Downpayment' : 'Balance'} (GCash)
                      </button>
                      <button onClick={() => onPayOnsite(inquiry.id)}
                        className="py-4 bg-white border-2 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2">
                        <Banknote className="w-4 h-4" /> Pay Onsite
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={onClose}
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ───────────────────────────────────────────────────────── */
const CustomerInquiries = () => {
  const [inquiries,       setInquiries]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [rateInquiry,     setRateInquiry]     = useState(null);

  useEffect(() => { loadInquiries(); }, []);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await getCustomerInquiries();
      setInquiries(response.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleAccept = async (id) => {
    if (!window.confirm('Accept this quotation?')) return;
    try { await acceptQuotation(id); loadInquiries(); if (selectedInquiry?.id === id) setSelectedInquiry(p => ({ ...p, status: 'approved' })); }
    catch { alert('Failed to accept quotation.'); }
  };
  const handleDecline = async (id) => {
    const reason = window.prompt('Reason for declining? (Optional)');
    if (reason === null) return;
    try { await declineQuotation(id, { reason }); loadInquiries(); if (selectedInquiry?.id === id) setSelectedInquiry(p => ({ ...p, status: 'rejected', rejection_reason: reason || 'Customer declined.' })); }
    catch { alert('Failed to decline quotation.'); }
  };
  const handlePayGcash = async (id) => {
    try { const r = await payInquiryGcash(id); if (r.checkout_url) window.location.href = r.checkout_url; }
    catch { alert('Failed to initiate GCash payment.'); }
  };
  const handlePayOnsite = async (id) => {
    if (!window.confirm('Pay onsite at our shop?')) return;
    try { await payInquiryOnsite(id); loadInquiries(); if (selectedInquiry?.id === id) setSelectedInquiry(p => ({ ...p, payment_method: 'onsite', payment_status: 'pay_onsite' })); }
    catch { alert('Failed to set payment method.'); }
  };

  const filtered = inquiries.filter(inq => {
    const matchSearch = inq.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) || inq.id.toString().includes(searchTerm);
    const matchStatus = filterStatus === 'all' || inq.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Count unrated completed inquiries for an alert
  const unratedCount = inquiries.filter(i => i.status === 'completed' && !i.review).length;

  const tabs = [
    { value: 'all',         label: 'All'         },
    { value: 'pending',     label: 'Pending'     },
    { value: 'quoted',      label: 'Quoted'      },
    { value: 'approved',    label: 'Approved'    },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed',   label: 'Completed'   },
    { value: 'rejected',    label: 'Rejected'    },
  ];

  return (
    <>
      {/* ── DESKTOP ──────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col p-6 bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 min-h-[calc(100vh-2.5rem)] overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Inquiries</h1>
            <p className="text-sm text-gray-400 mt-1 font-medium">Track and manage your service requests and custom designs.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by service or ID…" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Unrated banner (Desktop) */}
        {unratedCount > 0 && (
          <div className="mb-6 flex items-center gap-4 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-2xl px-5 py-4">
            <div className="flex gap-0.5 flex-shrink-0">
              {[1,2,3,4,5].map(n => <Star key={n} className="w-4 h-4 text-black fill-black" />)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-black uppercase tracking-tight leading-none">
                You have {unratedCount} completed service{unratedCount > 1 ? 's' : ''} waiting for your review!
              </p>
              <p className="text-[10px] text-black/60 font-bold mt-0.5">Your feedback helps us serve you better.</p>
            </div>
            <button
              onClick={() => setFilterStatus('completed')}
              className="flex-shrink-0 px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-900 transition-all"
            >
              View
            </button>
          </div>
        )}

        {/* Status tabs (Desktop) */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map(tab => {
            const count = tab.value === 'all' ? inquiries.length : inquiries.filter(i => i.status === tab.value).length;
            const unrated = tab.value === 'completed' ? unratedCount : 0;
            const active = filterStatus === tab.value;
            return (
              <button 
                key={tab.value} 
                onClick={() => setFilterStatus(tab.value)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all
                  ${active ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1
                    ${active ? 'bg-yellow-400 text-black' : 'bg-gray-300 text-gray-600'}`}>
                    {count}
                  </span>
                )}
                {unrated > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area (Desktop Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(n => (
                <div key={n} className="bg-white rounded-[28px] h-72 animate-pulse border border-gray-100 shadow-sm" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[32px] border border-gray-100 border-dashed">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                <MessageSquare className="w-9 h-9 text-gray-200" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">No inquiries found</h3>
              <p className="text-sm text-gray-400 max-w-xs text-center mx-auto">
                {searchTerm ? 'No results match your search.' : "You haven't submitted any inquiries yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(inquiry => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} onView={setSelectedInquiry} onRate={setRateInquiry} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden min-h-screen bg-gray-50 flex flex-col">
        <div className="h-20 flex-shrink-0" aria-hidden="true"></div>
        <div className="px-5 pb-10 flex flex-col flex-1 gap-6">
          
          {/* Mobile Header */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Inquiries</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">Track and manage your service requests.</p>
            
            <div className="relative mt-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search inquiries..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium"
              />
            </div>
          </div>

          {/* Status Tabs (Mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {tabs.map(tab => (
              <button 
                key={tab.value} 
                onClick={() => setFilterStatus(tab.value)}
                className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all
                  ${filterStatus === tab.value ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Unrated banner (Mobile) */}
          {unratedCount > 0 && (
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-black text-black uppercase tracking-tight">
                  {unratedCount} reviews pending!
                </p>
                <p className="text-[10px] text-black/60 font-bold mt-0.5">Share your feedback</p>
              </div>
              <button
                onClick={() => setFilterStatus('completed')}
                className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Rate Now
              </button>
            </div>
          )}

          {/* Content (Mobile) */}
          <div className="space-y-6 pb-20">
            {loading ? (
              [1,2,3].map(n => <div key={n} className="bg-white rounded-[28px] h-60 animate-pulse border border-gray-100" />)
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-[32px] border border-gray-100 p-10 text-center">
                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-black text-gray-800">No results found</p>
              </div>
            ) : (
              filtered.map(inquiry => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} onView={setSelectedInquiry} onRate={setRateInquiry} />
              ))
            )}
          </div>
        </div>
      </div>

      {selectedInquiry && (
        <DetailModal
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onPayGcash={handlePayGcash}
          onPayOnsite={handlePayOnsite}
          onRate={setRateInquiry}
        />
      )}

      {rateInquiry && (
        <ModalRateService inquiry={rateInquiry} onClose={() => setRateInquiry(null)} onRefresh={loadInquiries} />
      )}
    </>
  );
};

export default CustomerInquiries;