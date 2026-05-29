import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCustomerInquiries, acceptQuotation, declineQuotation, payInquiryGcash, payInquiryOnsite } from '../../services/InquiryAPI';
import CustomizationAPI from '../../services/CustomizationAPI';
import { format } from 'date-fns';
import { Search, Eye, Clock, MessageSquare, Tag, Star, X, CheckCircle, XCircle, CreditCard, Banknote, Sparkles, FileText, Check, ChevronRight, ArrowRight, Palette } from 'lucide-react';
import ModalRateService from '../../components/modals/ModalRateService';
import InquiryChatbox from '../../components/InquiryChatbox';
import DesignChatbox from '../../components/DesignChatbox';

/* ─── Status config ───────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending: { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  reviewed: { color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
  quoted: { color: '#8B5CF6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-400' },
  approved: { color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  in_progress: { color: '#06B6D4', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-400' },
  completed: { color: '#059669', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-400' },
  rejected: { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
};
const getStatus = (s) => STATUS_CONFIG[s?.toLowerCase()] || { color: '#6B7280', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' };

const CUSTOMIZATION_STATUS_CONFIG = {
  pending_request: { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', label: 'Pending Review' },
  pending_feasibility: { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', label: 'Feasibility Review' },
  can_accommodate: { color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400', label: 'Feasibility Approved' },
  partially_accommodate: { color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400', label: 'Partial Offer Available' },
  cannot_accommodate: { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400', label: 'Infeasible' },
  partial_pending_cx: { color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400', label: 'Partial Offer - Awaiting You' },
  ready_for_artist: { color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400', label: 'Approved for Artist' },
  assigned_to_artist: { color: '#6366F1', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-400', label: 'Artist Assigned' },
  in_progress: { color: '#8B5CF6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400', label: 'In Progress' },
  quotation_sent: { color: '#8B5CF6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400', label: 'Quotation Received' },
  revision_requested: { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400', label: 'Revision In Progress' },
  revision_period: { color: '#06B6D4', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-400', label: 'Revision & Chat Active' },
  design_finalized: { color: '#059669', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-400', label: 'Design Finalized' },
  pending_design_approval: { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400', label: 'Pending Admin Approval' },
  design_approved: { color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400', label: 'Design Approved' },
  design_rejected: { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400', label: 'Design Rejected by Admin' },
  in_production: { color: '#06B6D4', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-400', label: 'In Production' },
  qc_passed: { color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400', label: 'QC Quality Passed' },
  qc_failed: { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400', label: 'QC Failed - Reprinting' },
  converted_to_order: { color: '#14B8A6', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-400', label: 'Converted to Order' },
  rejected_by_staff: { color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400', label: 'Rejected by Staff' },
  cancelled: { color: '#6B7280', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', label: 'Cancelled' },
};
const getCustomizationStatus = (s) => CUSTOMIZATION_STATUS_CONFIG[s?.toLowerCase()] || { color: '#6B7280', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', label: s?.replace('_', ' ') || 'Unknown' };

/* ─── Star display (read-only) ────────────────────────────────────────── */
const StarDisplay = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
    ))}
  </div>
);

/* ─── Progress Timeline ───────────────────────────────────────────────── */
const STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'approved', label: 'Approved' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
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
                ${done ? 'bg-yellow-400 border-yellow-400' : ''}
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
  const isCompleted = inquiry.status === 'completed';
  const hasRated = !!inquiry.review;
  const needsRating = isCompleted && !hasRated;

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
  const [activeTab, setActiveTab] = useState('details');
  const s = getStatus(inquiry.status);
  const isCompleted = inquiry.status === 'completed';
  const hasRated = !!inquiry.review;
  const needsRating = isCompleted && !hasRated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-gray-200"
        style={{ height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Decal/Wrap Inquiry</p>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h3 className="text-lg font-bold text-gray-900">#{inquiry.id} — {inquiry.service_type?.replace(/_/g, ' ')}</h3>
              <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s.border} ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className="capitalize">{inquiry.status?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition flex-shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-1 mx-6 mt-4 mb-3 bg-gray-100 p-1 rounded-xl">
          {['details', 'chat'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-sm font-black rounded-lg transition capitalize ${activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t === 'chat' ? '💬 Chat' : '📋 Details'}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="p-6 space-y-5">

              {/* Progress Timeline */}
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Service Progress</p>
                <ProgressTimeline currentStatus={inquiry.status} />
              </div>

              {/* Quotation / Pricing result */}
              <div className="bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Quotation details</p>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-500">Quoted Amount</span>
                    <span className="text-lg font-bold text-gray-900">₱{inquiry.quotation_amount ? parseFloat(inquiry.quotation_amount).toLocaleString() : '—'}</span>
                  </div>
                  {inquiry.downpayment_amount > 0 && (
                    <div className="flex justify-between items-center py-2.5 border-t border-dashed border-gray-200">
                      <span className="text-sm text-gray-500">Downpayment Required</span>
                      <span className="text-sm font-bold text-amber-600">₱{parseFloat(inquiry.downpayment_amount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Estimated Price</span>
                  <span className="text-xl font-black text-[#FDE31E]">₱{inquiry.quotation_amount ? parseFloat(inquiry.quotation_amount).toLocaleString() : '—'}</span>
                </div>
              </div>

              {/* Admin response message */}
              {inquiry.admin_message && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">Admin Response</p>
                  <p className="text-sm text-gray-800 font-medium leading-relaxed">{inquiry.admin_message}</p>
                </div>
              )}

              {/* Rejection reason */}
              {inquiry.status === 'rejected' && inquiry.rejection_reason && (
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6">
                  <p className="text-[10px] font-bold text-red-600 uppercase mb-2">Reason for Rejection</p>
                  <p className="text-sm text-red-700 italic font-medium leading-relaxed">"{inquiry.rejection_reason}"</p>
                </div>
              )}

              {/* Payment details card */}
              {(inquiry.payment_status === 'paid' || inquiry.payment_status === 'pay_onsite') && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 space-y-2">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Payment Confirmation</p>
                  {[
                    ['Method', inquiry.payment_method?.replace(/_/g, ' ')],
                    ['Status', inquiry.payment_status?.replace(/_/g, ' ')],
                    ['Reference', inquiry.payment_reference],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800 capitalize">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Service details */}
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Service Details</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    ['Vehicle Type', inquiry.car_type],
                    ['Wrap Type', inquiry.wrap_type],
                    ['Decal Type', inquiry.decal_type],
                    ['Finish Type', inquiry.finish_type],
                    ['Placement', inquiry.placement],
                    ['Estimated Size', inquiry.size],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800 capitalize">{val}</span>
                    </div>
                  ))}
                  {inquiry.schedule_date && (
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200/60 text-sm col-span-2">
                      <span className="text-gray-500">Scheduled Date</span>
                      <span className="font-semibold text-yellow-600">{format(new Date(inquiry.schedule_date), 'MMM dd, yyyy – p')}</span>
                    </div>
                  )}
                  {inquiry.payment_status && (
                    <div className="flex justify-between items-center text-sm col-span-2">
                      <span className="text-gray-500">Payment Status</span>
                      <span className={`font-semibold uppercase ${inquiry.payment_status === 'paid' ? 'text-emerald-500' : 'text-red-400'}`}>{inquiry.payment_status}</span>
                    </div>
                  )}
                  {inquiry.amount_paid > 0 && (
                    <div className="flex justify-between items-center text-sm col-span-2">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="font-semibold text-emerald-600">₱{parseFloat(inquiry.amount_paid).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Attached design */}
              {inquiry.image && (
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Submitted Design</p>
                  <div className="rounded-2xl overflow-hidden border border-gray-200">
                    <img src={`http://localhost:8000/storage/${inquiry.image}`}
                      className="w-full object-cover" alt="Design" />
                  </div>
                </div>
              )}

              {/* Customer message */}
              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Your Message</p>
                <p className="text-sm text-gray-700 italic">"{inquiry.message || 'No additional notes provided.'}"</p>
              </div>

              {/* Review rating section */}
              {isCompleted && (
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Your Review</p>
                  {hasRated ? (
                    <div className="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-2">
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
                    <div className="bg-gradient-to-br from-yellow-400/90 to-yellow-300/90 rounded-2xl p-6 border border-yellow-400/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Star className="w-4 h-4 text-black fill-black" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black uppercase tracking-tight">How was your experience?</p>
                          <p className="text-[9px] text-black/60 font-bold mt-0.5">Your feedback helps us improve</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { onClose(); onRate(inquiry); }}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        Leave a Review
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="p-6 h-full flex flex-col min-h-0 bg-white">
              <InquiryChatbox inquiryId={inquiry.id} currentUser={{ role: 'user' }} />
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold uppercase text-gray-500 hover:text-gray-700 transition hover:bg-gray-100 rounded-xl border border-transparent">
            Close
          </button>

          {activeTab === 'details' && inquiry.status === 'quoted' && (
            <div className="flex gap-2">
              <button onClick={() => onAccept(inquiry.id)}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold uppercase text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-4 h-4" /> Accept
              </button>
              <button onClick={() => onDecline(inquiry.id)}
                className="px-6 py-3 bg-white text-red-500 hover:bg-red-50 rounded-2xl font-bold uppercase text-xs transition flex items-center gap-1.5 border border-red-200">
                <XCircle className="w-4 h-4" /> Decline
              </button>
            </div>
          )}

          {activeTab === 'details' && inquiry.status === 'approved' && inquiry.payment_status === 'unpaid' && (
            <div className="flex gap-2">
              <button onClick={() => onPayGcash(inquiry.id)}
                className="px-6 py-3 bg-[#FFE100] hover:bg-yellow-400 text-black rounded-2xl font-bold uppercase text-xs transition flex items-center gap-1.5 shadow-lg shadow-yellow-400/20">
                <CreditCard className="w-4 h-4" />
                GCash {inquiry.downpayment_amount > 0 && inquiry.amount_paid == 0 ? 'Downpayment' : 'Balance'}
              </button>
              <button onClick={() => onPayOnsite(inquiry.id)}
                className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50/50 rounded-2xl font-bold uppercase text-xs transition flex items-center gap-1.5 border border-blue-200">
                <Banknote className="w-4 h-4" /> Pay Onsite
              </button>
            </div>
          )}

          {activeTab === 'details' && needsRating && (
            <button
              onClick={() => { onClose(); onRate(inquiry); }}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-2xl font-bold uppercase text-xs transition flex items-center gap-1.5 shadow-lg shadow-yellow-400/20"
            >
              <Star className="w-4 h-4 fill-black" /> Rate Service
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Customization Card ────────────────────────────────────────────────── */
const CustomizationCard = ({ request, onView }) => {
  const s = getCustomizationStatus(request.status);
  const formattedDate = request.created_at ? format(new Date(request.created_at), 'MMM dd, yyyy') : '';

  return (
    <div className="group bg-white rounded-[28px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 overflow-hidden flex flex-col">
      {request.reference_image ? (
        <div className="h-40 overflow-hidden relative">
          <img
            src={`http://localhost:8000/storage/${request.reference_image}`}
            alt="Reference Design"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className={`absolute top-4 left-4 flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border} border px-3 py-1 rounded-full`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
          </div>
        </div>
      ) : (
        <div className="h-2 w-full" style={{ background: s.color }} />
      )}

      <div className="p-6 flex flex-col flex-1">
        {!request.reference_image && (
          <div className={`self-start flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border} border px-3 py-1 rounded-full mb-4`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
          </div>
        )}

        <div className="mb-4">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Custom Order Inquiry</span>
          <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-yellow-500 transition-colors">
            {request.product_name || request.product?.product_name || 'Custom Product'}
          </h3>
        </div>

        <div className="space-y-1 text-xs text-gray-500 mb-6 font-medium">
          <div className="flex justify-between">
            <span>Quantity:</span>
            <span className="font-bold text-gray-900">{request.quantity} pcs</span>
          </div>
          {request.material_type && (
            <div className="flex justify-between">
              <span>Material:</span>
              <span className="font-bold text-gray-900">{request.material_type}</span>
            </div>
          )}
          {request.size_requested && (
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-bold text-gray-900">{request.size_requested}</span>
            </div>
          )}
          {formattedDate && (
            <div className="flex justify-between">
              <span>Date Requested:</span>
              <span className="font-bold text-gray-900">{formattedDate}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Quoted Price</span>
            <span className="text-lg font-black text-gray-900">
              {request.quotation_total > 0
                ? `₱${Number(request.quotation_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : 'Pending Quote'}
            </span>
          </div>

          <button
            onClick={() => onView(request)}
            className="flex items-center gap-1 px-4 py-2 bg-gray-900 hover:bg-yellow-400 hover:text-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Customization Detail Modal ─────────────────────────────────────────── */
const CustomizationDetailModal = ({ request, onClose, onRefresh }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('GCash');

  const [needsRevisionPeriod, setNeedsRevisionPeriod] = useState(true);
  const [revisionDays, setRevisionDays] = useState(2);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  const s = getCustomizationStatus(request.status);

  const steps = [
    { key: 'pending_request', label: 'Submit' },
    { key: 'pending_feasibility', label: 'Feasibility' },
    { key: 'quotation_sent', label: 'Quotation' },
    { key: 'assigned_to_artist', label: 'Design Layout' },
    { key: 'design_approved', label: 'Approved Design' },
    { key: 'converted_to_order', label: 'Fulfillment Order' },
  ];

  const getCurrentStepIndex = () => {
    const status = request.status?.toLowerCase();
    if (status === 'cancelled' || status === 'cannot_accommodate' || status === 'rejected_by_staff') return -1;
    
    if (status === 'pending_request') return 0;
    if (status === 'pending_feasibility') return 1;
    if (status === 'can_accommodate' || status === 'partially_accommodate' || status === 'partial_pending_cx' || status === 'ready_for_artist') return 1;
    if (status === 'assigned_to_artist' || status === 'quotation_sent') return 2;
    if (status === 'in_progress' || status === 'revision_period' || status === 'revision_requested' || status === 'design_finalized' || status === 'pending_design_approval' || status === 'design_rejected') return 3;
    if (status === 'design_approved') return 4;
    if (status === 'in_production' || status === 'qc_passed' || status === 'qc_failed' || status === 'converted_to_order') return 5;
    return 0;
  };

  const currentIndex = getCurrentStepIndex();
  const pct = currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 100;

  const handleApproveQuotation = async () => {
    if (!window.confirm('Are you sure you want to approve this quotation?')) return;
    try {
      setLoading(true);
      setActionError('');
      await CustomizationAPI.approveCustomQuotation(request.id, needsRevisionPeriod, revisionDays);
      setActionSuccess(needsRevisionPeriod ? 'Quotation approved! Revision period & layout chat started.' : 'Quotation approved! Design finalized.');
      onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve quotation.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineQuotation = async () => {
    if (!window.confirm('Are you sure you want to decline this quotation and cancel the request?')) return;
    try {
      setLoading(true);
      setActionError('');
      await CustomizationAPI.declineCustomQuotation(request.id);
      setActionSuccess('Quotation declined. Request cancelled.');
      onRefresh();
      setTimeout(onClose, 2000);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to decline quotation.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondPartial = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this partial accommodation offer?`)) return;
    try {
      setLoading(true);
      setActionError('');
      await CustomizationAPI.customerRespondPartial(request.id, action);
      setActionSuccess(action === 'accept' ? 'Partial offer accepted! Proceeding to artist assignment.' : 'Offer declined. Request cancelled.');
      onRefresh();
      if (action === 'decline') {
        setTimeout(onClose, 2000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRevisionRequest = async () => {
    if (!revisionNotes.trim()) {
      alert('Please enter your revision requirements.');
      return;
    }
    try {
      setLoading(true);
      setActionError('');
      await CustomizationAPI.customerRequestRevision(request.id, revisionNotes.trim());
      setActionSuccess('Revision request submitted to layout artist.');
      setRevisionNotes('');
      setShowRevisionForm(false);
      onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to submit revision request.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToOrder = async () => {
    try {
      setLoading(true);
      setActionError('');
      const res = await CustomizationAPI.convertToOrder(request.id, selectedPayment);
      setActionSuccess('Order created successfully!');
      onRefresh();
      
      if (selectedPayment === 'GCash') {
        try {
          const payRes = await payInquiryGcash(res.order_id);
          if (payRes.checkout_url) {
            window.location.href = payRes.checkout_url;
            return;
          }
        } catch {
          setActionError('Order created but failed to launch GCash portal. Please pay from "My Orders" tab.');
        }
      } else {
        setTimeout(onClose, 2500);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to complete checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[90] p-4 animate-fadeIn">
      <div className="bg-white rounded-[32px] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customization Request</span>
              <span className={`flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border} border px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest`}>
                <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            </div>
            <h2 className="text-xl font-black text-gray-900">
              {request.product_name || request.product?.product_name || 'Custom Product'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Progress */}
        {request.status !== 'cancelled' && (
          <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 overflow-x-auto scrollbar-none">
            <div className="min-w-[650px] relative py-4">
              <div className="absolute left-0 top-[23px] w-full h-[2px] bg-gray-100 rounded-full" />
              <div
                className="absolute left-0 top-[23px] h-[2px] bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-start justify-between">
                {steps.map((step, i) => {
                  const done = i < currentIndex;
                  const current = i === currentIndex;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1.5 z-10 w-24">
                      <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 flex items-center justify-center text-[8px] font-black
                        ${done ? 'bg-yellow-400 border-yellow-400 text-black' : ''}
                        ${current ? 'bg-white border-yellow-400 scale-125 shadow-[0_0_0_4px_rgba(251,191,36,0.15)] text-yellow-500' : ''}
                        ${!done && !current ? 'bg-white border-gray-200 text-gray-300' : ''}`}
                      >
                        {done && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest leading-tight text-center ${current ? 'text-yellow-500' : done ? 'text-gray-600' : 'text-gray-300'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-gray-100 bg-white px-6">
          {[
            { id: 'details', label: 'Specs & Quotation', icon: FileText },
            { id: 'mockups', label: 'Design Mockup', icon: Sparkles, disabled: !request.mockup_image && !request.artist }
          ].map(tab => (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 text-xs font-black uppercase tracking-widest transition-all
                ${tab.disabled ? 'opacity-40 cursor-not-allowed text-gray-300 border-transparent' : ''}
                ${activeTab === tab.id ? 'border-yellow-400 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          
          {actionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              {actionSuccess}
            </div>
          )}

          {/* ── "Go to Artist Inbox" CTA ── visible as soon as artist is assigned */}
          {request.artist && (
            <div className="mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 shadow-lg relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-yellow-400/5 rounded-full blur-2xl" />
              <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-indigo-400/5 rounded-full blur-xl" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                  <Palette className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Your Layout Artist is Assigned</h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">Go to your Artist Inbox to communicate & discuss the design directly.</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/customer-artist-inbox', { state: { selectedCustomizationId: request.id } });
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black hover:bg-yellow-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-yellow-400/20 active:scale-95"
                >
                  Go to Artist Inbox
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: DETAILS & QUOTATION */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Client Specs */}
              <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 italic">Itemized Requirements</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-500">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Quantity</span>
                      <span className="text-sm font-black text-gray-900">{request.quantity} Unit(s)</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Material Type</span>
                      <span className="text-sm font-black text-gray-900">{request.material_type || 'Standard'}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Size requested</span>
                      <span className="text-sm font-black text-gray-900">{request.size_requested || 'Custom'}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="block text-[9px] uppercase tracking-widest text-gray-400 mb-1">Category</span>
                      <span className="text-sm font-black text-gray-900">{request.product?.product_category || 'Printing'}</span>
                    </div>
                  </div>
                </div>

                {request.instructions && (
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 italic">Client Instructions</h3>
                    <p className="text-xs font-medium leading-relaxed text-gray-600 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      {request.instructions}
                    </p>
                  </div>
                )}

                {request.reference_image && (
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 italic">Design Reference</h3>
                    <a
                      href={`http://localhost:8000/storage/${request.reference_image}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block relative aspect-video rounded-2xl overflow-hidden border border-gray-100 cursor-zoom-in"
                    >
                      <img
                        src={`http://localhost:8000/storage/${request.reference_image}`}
                        alt="Design Reference"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">
                        View Fullscreen Reference
                      </div>
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column: Quotation Breakdown */}
              <div className="space-y-6">
                {request.quotation ? (
                  <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 italic">Quotation Breakdown</h3>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-xs font-medium text-gray-500">
                        <span>Material Fee</span>
                        <span className="font-bold text-gray-900">₱{Number(request.quotation.material_cost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-gray-500">
                        <span>Printing & Setup Fee</span>
                        <span className="font-bold text-gray-900">₱{Number(request.quotation.printing_cost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-gray-500">
                        <span>Artist Design Fee</span>
                        <span className="font-bold text-gray-900">₱{Number(request.quotation.design_fee).toFixed(2)}</span>
                      </div>
                      {Number(request.quotation.additional_charges) > 0 && (
                        <div className="flex justify-between text-xs font-medium text-gray-500">
                          <span>Additional Customizations</span>
                          <span className="font-bold text-gray-900">₱{Number(request.quotation.additional_charges).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {request.quotation.additional_notes && (
                        <div className="mt-4 p-3 bg-violet-50/50 border border-violet-100 rounded-xl text-[11px] text-violet-700">
                          <strong className="block mb-0.5">Staff Notes:</strong>
                          {request.quotation.additional_notes}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-6 text-white flex justify-between items-center mb-6">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Quoted Amount</span>
                        <span className="block text-2xl font-black italic text-yellow-400">
                          ₱{Number(request.quotation.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <CheckCircle className="w-8 h-8 text-emerald-400 opacity-60" />
                    </div>

                    {/* Quotation Approval Actions */}
                    {request.status === 'quotation_sent' && (
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={needsRevisionPeriod}
                              onChange={(e) => setNeedsRevisionPeriod(e.target.checked)}
                              className="w-4 h-4 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                            />
                            <div className="text-left">
                              <span className="text-xs font-black text-gray-800 uppercase block">Require Revision & Discussion</span>
                              <span className="text-[10px] text-gray-400 font-bold leading-none block mt-0.5">Enables mockup modifications & direct chat with layout artist.</span>
                            </div>
                          </label>
                          {needsRevisionPeriod && (
                            <div className="pl-6 flex items-center gap-3">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Days:</span>
                              <select
                                value={revisionDays}
                                onChange={(e) => setRevisionDays(Number(e.target.value))}
                                className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-yellow-400"
                              >
                                <option value={1}>1 Day revision window</option>
                                <option value={2}>2 Days revision window</option>
                                <option value={3}>3 Days revision window</option>
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            disabled={loading}
                            onClick={handleApproveQuotation}
                            className="py-4 bg-[#FFE100] text-black hover:bg-yellow-400 font-black uppercase text-[10px] tracking-widest rounded-2xl transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-yellow-400/10"
                          >
                            Approve Quotation
                          </button>
                          <button
                            disabled={loading}
                            onClick={handleDeclineQuotation}
                            className="py-4 bg-white text-red-500 hover:bg-red-50/50 border border-red-200 font-black uppercase text-[10px] tracking-widest rounded-2xl transition active:scale-[0.98]"
                          >
                            Decline Request
                          </button>
                        </div>
                      </div>
                    )}


                  </div>
                ) : (
                  request.status !== 'partial_pending_cx' && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-[28px] p-8 text-center">
                      <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                      <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-2">Price to be Quoted</h4>
                      <p className="text-xs text-amber-600 font-medium leading-relaxed max-w-sm mx-auto">
                        Our customer service is reviewing your specifications (materials, quantity, designs) and will issue an itemized quotation shortly.
                      </p>
                    </div>
                  )
                )}

                {/* Partial Accommodation Scope Offer Banner */}
                {request.status === 'partial_pending_cx' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-[28px] p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Clock className="w-10 h-10 text-orange-500 flex-shrink-0" />
                      <div className="text-left">
                        <h4 className="text-sm font-black text-orange-800 uppercase tracking-widest">Partial Scope Offer</h4>
                        <p className="text-[11px] text-orange-600 font-bold">The staff reviewed your request and can partially accommodate it.</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-orange-100 space-y-2 text-xs font-semibold text-left">
                      <div className="flex justify-between text-gray-500">
                        <span>Proposed Quantity:</span>
                        <span className="text-gray-900 font-black">{request.approved_quantity} pcs</span>
                      </div>
                      {request.validation_notes && (
                        <div className="pt-2 border-t border-dashed border-gray-100 text-gray-700">
                          <strong className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 text-gray-400">Staff Explanation:</strong>
                          "{request.validation_notes}"
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        disabled={loading}
                        onClick={() => handleRespondPartial('accept')}
                        className="py-3 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition active:scale-[0.98]"
                      >
                        Accept Offer
                      </button>
                      <button
                        disabled={loading}
                        onClick={() => handleRespondPartial('decline')}
                        className="py-3 bg-white text-red-500 hover:bg-red-50/50 border border-red-200 font-black uppercase text-[10px] tracking-widest rounded-2xl transition active:scale-[0.98]"
                      >
                        Decline & Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Final Checkout Panel */}
                {request.status === 'design_approved' && !request.order_id && (
                  <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 italic">Ready for Final Checkout</h3>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Your layout design and pricing have been finalized! Select your preferred payment method to secure your order.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['GCash', 'COD', 'Pickup'].map(method => (
                        <button
                          key={method}
                          onClick={() => setSelectedPayment(method)}
                          className={`py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all
                            ${selectedPayment === method
                              ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {method === 'COD' ? 'Cash on Del.' : method}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={loading}
                      onClick={handleConvertToOrder}
                      className="w-full py-4 bg-[#FFE100] text-black hover:bg-yellow-400 font-black uppercase text-xs tracking-widest rounded-2xl transition shadow-lg shadow-yellow-400/20"
                    >
                      {loading ? 'Processing Order...' : 'Pay & Convert to Order'}
                    </button>
                  </div>
                )}

                {request.order_id && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[28px] p-6 text-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-black text-emerald-800 uppercase tracking-widest">Order Confirmed!</h4>
                    <p className="text-xs text-emerald-600 font-medium leading-relaxed max-w-sm mx-auto">
                      This customized item has been successfully converted into a production order. You can track physical printing, packing, and shipment under your "Orders" tab.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DESIGN MOCKUP */}
          {activeTab === 'mockups' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 italic">Artist Mockup & Alignment</h3>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Review the mockup template uploaded by your assigned artist. You can approve this design or request revisions.
                  </p>
                </div>

                {request.mockup_image ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <div className="lg:col-span-2">
                      <a
                        href={`http://localhost:8000/storage/${request.mockup_image}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block relative border border-gray-100 rounded-3xl overflow-hidden cursor-zoom-in aspect-video bg-gray-50"
                      >
                        <img
                          src={`http://localhost:8000/storage/${request.mockup_image}`}
                          alt="Artist Mockup Layout"
                          className="w-full h-full object-contain group-hover:scale-101 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">
                          Open Original Mockup File
                        </div>
                      </a>
                    </div>

                    <div className="space-y-6 flex flex-col justify-center">
                      <div className="bg-gray-50 p-6 rounded-2xl space-y-3 text-left">
                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black block">Current Layout Status</span>
                        <div className="text-sm font-black text-gray-900 capitalize">{request.design_status || 'Waiting review'}</div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          {request.status === 'revision_period'
                            ? 'Active revision period. You can request changes or chat directly with the artist to modify the design.'
                            : 'The layout has been locked. Design modifications are closed.'}
                        </p>
                      </div>

                      {request.status === 'revision_period' && (
                        <div className="space-y-3">
                          {!showRevisionForm ? (
                            <button
                              disabled={loading}
                              onClick={() => setShowRevisionForm(true)}
                              className="w-full py-4 bg-gray-900 text-white hover:bg-yellow-400 hover:text-black font-black uppercase text-xs tracking-widest rounded-2xl transition"
                            >
                              Request Design Revision
                            </button>
                          ) : (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left block">Revision instructions</span>
                              <textarea
                                value={revisionNotes}
                                onChange={(e) => setRevisionNotes(e.target.value)}
                                placeholder="Describe what changes you want the artist to make (e.g. adjust margins, change background color, align text)..."
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  disabled={loading || !revisionNotes.trim()}
                                  onClick={handleSendRevisionRequest}
                                  className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition"
                                >
                                  Submit Revision
                                </button>
                                <button
                                  disabled={loading}
                                  onClick={() => { setShowRevisionForm(false); setRevisionNotes(''); }}
                                  className="px-3 py-2 bg-white border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-[28px] p-12 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-1">Mockup Under Development</h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Your assigned artist is preparing design templates and scaling options based on your directions. We'll alert you once it is uploaded.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ───────────────────────────────────────────────────────── */
const CustomerInquiries = () => {
  const location = useLocation();
  const [inquiries, setInquiries] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [activeSection, setActiveSection] = useState('services'); // 'services' or 'customizations'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [selectedCustomization, setSelectedCustomization] = useState(null);
  const [rateInquiry, setRateInquiry] = useState(null);

  // Auto-switch to Custom Products tab when redirected from submission or chat navigation
  useEffect(() => {
    if (location.state?.openCustomizations || location.state?.selectedCustomizationId) {
      setActiveSection('customizations');
      setFilterStatus('all');
      
      const custId = location.state?.selectedCustomizationId;
      if (custId && customizations.length > 0) {
        const found = customizations.find(c => c.id === Number(custId));
        if (found) {
          setSelectedCustomization(found);
        }
      }
      
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, customizations]);

  useEffect(() => {
    loadInquiries();
    loadCustomizations();
  }, []);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await getCustomerInquiries();
      setInquiries(response.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadCustomizations = async () => {
    try {
      const response = await CustomizationAPI.fetchMyCustomizations();
      setCustomizations(response.data || response || []);
    } catch (err) {
      console.error('Failed to load customizations:', err);
    }
  };

  const handleRefreshCustomization = async () => {
    if (!selectedCustomization) return;
    try {
      const res = await CustomizationAPI.fetchCustomizationDetail(selectedCustomization.id);
      setSelectedCustomization(res.data || res);
      loadCustomizations();
    } catch (err) {
      console.error(err);
    }
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

  const filteredCustomizations = customizations.filter(cust => {
    const matchSearch = (cust.product_name || cust.product?.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || cust.id.toString().includes(searchTerm);
    if (filterStatus === 'all') return matchSearch;
    if (filterStatus === 'pending') {
      return matchSearch && [
        'pending_request', 'pending_feasibility', 'can_accommodate',
        'partially_accommodate', 'partial_pending_cx', 'ready_for_artist'
      ].includes(cust.status);
    }
    if (filterStatus === 'quoted') {
      return matchSearch && cust.status === 'quotation_sent';
    }
    if (filterStatus === 'approved') {
      return matchSearch && [
        'design_approved', 'design_finalized', 'pending_design_approval'
      ].includes(cust.status);
    }
    if (filterStatus === 'in_progress') {
      return matchSearch && [
        'assigned_to_artist', 'revision_period', 'revision_requested',
        'in_production', 'qc_passed', 'qc_failed'
      ].includes(cust.status);
    }
    if (filterStatus === 'completed') {
      return matchSearch && cust.status === 'converted_to_order';
    }
    if (filterStatus === 'rejected') {
      return matchSearch && [
        'cancelled', 'cannot_accommodate', 'rejected_by_staff', 'design_rejected'
      ].includes(cust.status);
    }
    return matchSearch;
  });

  // Count unrated completed inquiries for an alert
  const unratedCount = inquiries.filter(i => i.status === 'completed' && !i.review).length;

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'quoted', label: 'Quoted' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <>
      {/* ── DESKTOP ──────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col p-6 bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 min-h-[calc(100vh-2.5rem)] overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Inquiries</h1>
            <p className="text-sm text-gray-400 mt-1 font-medium">Track and manage your service requests and custom designs.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeSection === 'services' ? "Search by service or ID…" : "Search by product or ID…"}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Section Tabs (Service Inquiries / Product Customizations) */}
        <div className="flex bg-gray-100/80 p-1 rounded-2xl max-w-md mb-8">
          <button
            onClick={() => { setActiveSection('services'); setFilterStatus('all'); }}
            className={`flex-1 py-3 px-5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2
              ${activeSection === 'services' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4" /> Service Inquiries
          </button>
          <button
            onClick={() => { setActiveSection('customizations'); setFilterStatus('all'); }}
            className={`flex-1 py-3 px-5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2
              ${activeSection === 'customizations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Sparkles className="w-4 h-4" /> Custom Products
          </button>
        </div>

        {/* Unrated banner (Desktop) */}
        {unratedCount > 0 && (
          <div className="mb-6 flex items-center gap-4 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-2xl px-5 py-4">
            <div className="flex gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map(n => <Star key={n} className="w-4 h-4 text-black fill-black" />)}
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
            const count = tab.value === 'all'
              ? (activeSection === 'services' ? inquiries.length : customizations.length)
              : (activeSection === 'services'
                  ? inquiries.filter(i => i.status === tab.value).length
                  : customizations.filter(c => {
                      if (tab.value === 'pending') return c.status === 'pending_request' || c.status === 'under_validation';
                      if (tab.value === 'quoted') return c.status === 'quotation_sent';
                      if (tab.value === 'approved') return c.status === 'quotation_approved' || c.status === 'approved_final_design';
                      if (tab.value === 'in_progress') return c.status === 'assigned_to_artist' || c.status === 'designing' || c.status === 'waiting_customer_approval' || c.status === 'revision_requested';
                      if (tab.value === 'completed') return c.status === 'converted_to_order';
                      if (tab.value === 'rejected') return c.status === 'cancelled';
                      return false;
                    }).length
                );
            const unrated = activeSection === 'services' && tab.value === 'completed' ? unratedCount : 0;
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
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="bg-white rounded-[28px] h-72 animate-pulse border border-gray-100 shadow-sm" />
              ))}
            </div>
          ) : activeSection === 'services' ? (
            filtered.length === 0 ? (
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
            )
          ) : (
            filteredCustomizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[32px] border border-gray-100 border-dashed">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <Sparkles className="w-9 h-9 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">No customizations found</h3>
                <p className="text-sm text-gray-400 max-w-xs text-center mx-auto">
                  {searchTerm ? 'No custom requests match your search.' : "You haven't submitted any custom design requests yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomizations.map(cust => (
                  <CustomizationCard key={cust.id} request={cust} onView={setSelectedCustomization} />
                ))}
              </div>
            )
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

            {/* Mobile inline tabs */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mt-4">
              <button
                onClick={() => { setActiveSection('services'); setFilterStatus('all'); }}
                className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5
                  ${activeSection === 'services' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Services
              </button>
              <button
                onClick={() => { setActiveSection('customizations'); setFilterStatus('all'); }}
                className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5
                  ${activeSection === 'customizations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Custom
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeSection === 'services' ? "Search service inquiries..." : "Search custom requests..."}
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
          {activeSection === 'services' && unratedCount > 0 && (
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
              [1, 2, 3].map(n => <div key={n} className="bg-white rounded-[28px] h-60 animate-pulse border border-gray-100" />)
            ) : activeSection === 'services' ? (
              filtered.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-gray-100 p-10 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-black text-gray-800">No results found</p>
                </div>
              ) : (
                filtered.map(inquiry => (
                  <InquiryCard key={inquiry.id} inquiry={inquiry} onView={setSelectedInquiry} onRate={setRateInquiry} />
                ))
              )
            ) : (
              filteredCustomizations.length === 0 ? (
                <div className="bg-white rounded-[32px] border border-gray-100 p-10 text-center">
                  <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-black text-gray-800">No customizations found</p>
                </div>
              ) : (
                filteredCustomizations.map(cust => (
                  <CustomizationCard key={cust.id} request={cust} onView={setSelectedCustomization} />
                ))
              )
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

      {selectedCustomization && (
        <CustomizationDetailModal
          request={selectedCustomization}
          onClose={() => setSelectedCustomization(null)}
          onRefresh={handleRefreshCustomization}
        />
      )}

      {rateInquiry && (
        <ModalRateService inquiry={rateInquiry} onClose={() => setRateInquiry(null)} onRefresh={loadInquiries} />
      )}
    </>
  );
};

export default CustomerInquiries;