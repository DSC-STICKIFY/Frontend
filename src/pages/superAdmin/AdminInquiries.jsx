import React, { useState, useEffect } from "react";
import { fetchInquiries, updateInquiryStatus, markInquiryPaid } from "../../services/InquiryAPI";
import { getImageUrl } from "../../services/api";
import { RefreshCw, Eye, X, CheckCircle, Clock, Tag, User, Phone, Mail, Calendar, MessageSquare, FileText, CheckCircle2 } from "lucide-react";
import toast from 'react-hot-toast';
import ModalConfirmAction from "../../components/modals/ModalConfirmAction";

/* ─── Status config ───────────────────────────────────────────────────── */
const STATUS = {
  pending:     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400'   },
  reviewed:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-400'    },
  quoted:      { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200', dot: 'bg-violet-400'  },
  approved:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-400' },
  scheduled:   { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',    dot: 'bg-sky-400'     },
  in_progress: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',   dot: 'bg-cyan-400'    },
  completed:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-400'   },
  rejected:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-400'     },
};

const getS = (s) => STATUS[s?.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' };

const StatusBadge = ({ status }) => {
  const s = getS(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

/* ─── Field display ───────────────────────────────────────────────────── */
const Field = ({ label, value }) => value ? (
  <div>
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
    <p className="text-sm font-bold text-gray-800 capitalize">{value}</p>
  </div>
) : null;

/* ─── Detail Modal ────────────────────────────────────────────────────── */
const InquiryDetailModal = ({ inquiry, onClose, onSave, onMarkPaid }) => {
  const [status,            setStatus]            = useState(inquiry.status);
  const [adminMessage,      setAdminMessage]      = useState(inquiry.admin_message || '');
  const [quotationAmount,   setQuotationAmount]   = useState(inquiry.quotation_amount || '');
  const [downpaymentAmount, setDownpaymentAmount] = useState(inquiry.downpayment_amount || '');
  const [scheduleDate,      setScheduleDate]      = useState(inquiry.schedule_date ? inquiry.schedule_date.substring(0, 16) : '');
  const [paymentStatus,     setPaymentStatus]     = useState(inquiry.payment_status || 'unpaid');
  const [rejectionReason,   setRejectionReason]   = useState(inquiry.rejection_reason || '');
  const [isSaving,          setIsSaving]          = useState(false);

  // Sync local state when the inquiry prop updates (e.g. after Mark as Paid)
  useEffect(() => {
    setStatus(inquiry.status);
    setAdminMessage(inquiry.admin_message || '');
    setQuotationAmount(inquiry.quotation_amount || '');
    setDownpaymentAmount(inquiry.downpayment_amount || '');
    setScheduleDate(inquiry.schedule_date ? inquiry.schedule_date.substring(0, 16) : '');
    setPaymentStatus(inquiry.payment_status || 'unpaid');
    setRejectionReason(inquiry.rejection_reason || '');
  }, [inquiry]);

  const showQuotation = ['quoted', 'approved', 'scheduled', 'in_progress', 'completed'].includes(status);
  const showSchedule  = ['scheduled', 'in_progress', 'completed'].includes(status);
  const isRejected    = status === 'rejected';

  const handleSave = async () => {
    // Determine if confirmation is needed (for critical statuses)
    const needsConfirm = ['quoted', 'scheduled', 'rejected'].includes(status) || status !== inquiry.status;
    
    const proceed = async () => {
        setIsSaving(true);
        try {
          await onSave(inquiry.id, {
            status, admin_message: adminMessage,
            quotation_amount: quotationAmount, downpayment_amount: downpaymentAmount,
            schedule_date: scheduleDate, payment_status: paymentStatus,
            rejection_reason: rejectionReason,
          });
          toast.success(`${status.replace('_', ' ').toUpperCase()} updated successfully!`);
        } catch (error) {
          toast.error("Failed to update inquiry.");
        } finally {
          setIsSaving(false);
        }
    };

    if (needsConfirm) {
        // We'll pass a "triggerConfirm" prop or use the parent's state
        // Since handleSave is in the child, let's just use a simple window confirm for now or better, move confirm to parent.
        // Actually, the user wants a Modal. I will add a local confirm state to the modal too.
        setLocalConfirm({
            title: `Update to ${status.replace('_', ' ')}?`,
            message: `Are you sure you want to update this inquiry to ${status}?`,
            confirmText: "Proceed",
            type: status === 'rejected' ? 'danger' : 'info',
            onConfirm: proceed
        });
    } else {
        proceed();
    }
  };

  const [localConfirm, setLocalConfirm] = useState(null);

  const s = getS(status);

  /* Service detail rows */
  const serviceFields = inquiry.service_type === 'car_wrap' ? [
    ['Car Type',            inquiry.car_type],
    ['Wrap Type',           inquiry.wrap_type],
    ['Color / Style',       inquiry.color_style],
  ] : inquiry.service_type === 'car_decal' ? [
    ['Decal Type',          inquiry.decal_type],
    ['Placement',           inquiry.placement],
    ['Size',                inquiry.size],
  ] : [
    ['Motor Model',         inquiry.motor_model],
    ['Finish Type',         inquiry.finish_type],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ height: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex-shrink-0 flex items-start justify-between px-10 pt-9 pb-7 border-b border-gray-100">
          <div>
            <StatusBadge status={status} />
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mt-2 leading-none">
              {inquiry.service_type?.replace(/_/g, ' ')}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID #{inquiry.id}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500 hover:text-black flex-shrink-0 mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0 h-full">

            {/* Left — forms */}
            <div className="p-10 space-y-8 border-r border-gray-100">

              {/* Customer info */}
              <div className="bg-gray-50 rounded-[24px] p-6">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Customer</p>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-black italic uppercase tracking-tighter text-gray-900 leading-none">{inquiry.customer_name}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                        <Mail className="w-3 h-3" /> {inquiry.email}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                        <Phone className="w-3 h-3" /> {inquiry.contact_number}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status + service fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status select */}
                <div className="col-span-2 md:col-span-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Status</p>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none border-2 transition-all cursor-pointer ${s.bg} ${s.text} ${s.border}`}
                  >
                    {['pending','reviewed','quoted','approved','scheduled','in_progress','completed','rejected'].map(v => (
                      <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Service type badge */}
                <div className="col-span-2 md:col-span-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Service Type</p>
                  <div className="px-4 py-3 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                    {inquiry.service_type?.replace(/_/g, ' ')}
                  </div>
                </div>

                {serviceFields.map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{label}</p>
                    <p className="text-sm font-bold text-gray-800">{val || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Quotation fields */}
              {showQuotation && (
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Quotation</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Amount (₱)</label>
                      <input
                        type="number"
                        value={quotationAmount}
                        onChange={e => setQuotationAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#FDE31E] focus:border-[#FDE31E] outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Downpayment (₱)</label>
                      <input
                        type="number"
                        value={downpaymentAmount}
                        onChange={e => setDownpaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#FDE31E] focus:border-[#FDE31E] outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              {showSchedule && (
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Appointment Date & Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#FDE31E] focus:border-[#FDE31E] outline-none transition"
                  />
                </div>
              )}

              {/* Rejection reason */}
              {isRejected && (
                <div>
                  <label className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] block mb-2">Reason for Rejection</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejecting this inquiry…"
                    rows={3}
                    className="w-full px-5 py-4 bg-red-50 border-2 border-red-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-red-300 outline-none transition resize-none"
                  />
                </div>
              )}

              {/* Payment status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value)}
                    className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#FDE31E] outline-none transition cursor-pointer"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial / Downpayment</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>

                {/* Customer message inline */}
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3 h-3" /> Customer Message
                  </label>
                  <div className="px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-medium text-gray-600 leading-relaxed min-h-[56px]">
                    {inquiry.message || <span className="italic text-gray-300">No message provided.</span>}
                  </div>
                </div>
              </div>

              {/* Admin notes */}
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mb-2">
                  <FileText className="w-3 h-3" /> Admin Response / Notes
                </label>
                <textarea
                  value={adminMessage}
                  onChange={e => setAdminMessage(e.target.value)}
                  placeholder="Write your response or quotation notes here…"
                  rows={4}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#FDE31E] outline-none transition resize-none"
                />
              </div>
            </div>

            {/* Right — image + quick summary */}
            <div className="p-8 space-y-6 bg-gray-50/40">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Attached Design</p>
                {inquiry.image ? (
                  <div className="rounded-[24px] overflow-hidden border border-gray-100 shadow-lg group">
                    <img
                      src={`http://127.0.0.1:8000/storage/${inquiry.image}`}
                      alt="Inquiry attachment"
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="h-52 rounded-[24px] bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[9px] font-black uppercase tracking-widest">No Image</span>
                  </div>
                )}
              </div>

              {/* Quick info */}
              <div className="bg-white rounded-[24px] border border-gray-100 p-5 space-y-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Quick Info</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-bold">Submitted</span>
                    <span className="text-[10px] font-black text-gray-700">{new Date(inquiry.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  {inquiry.quotation_amount && (
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <span className="text-[10px] text-gray-400 font-bold">Quoted</span>
                      <span className="text-sm font-black text-emerald-600">₱{parseFloat(inquiry.quotation_amount).toLocaleString()}</span>
                    </div>
                  )}
                  {inquiry.downpayment_amount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-bold">Downpayment</span>
                      <span className="text-sm font-black text-amber-600">₱{parseFloat(inquiry.downpayment_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400 font-bold">Payment</span>
                    <span className={`text-[10px] font-black uppercase ${inquiry.payment_status === 'paid' ? 'text-emerald-500' : inquiry.payment_status === 'partial' ? 'text-amber-500' : 'text-red-400'}`}>
                      {inquiry.payment_status || 'unpaid'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="flex-shrink-0 px-10 py-6 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors rounded-2xl hover:bg-gray-50">
            Cancel
          </button>

          {status === 'completed' && inquiry.payment_status !== 'paid' && (
            <button
              onClick={() => onMarkPaid(inquiry.id)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Mark as Paid
            </button>
          )}

          {(status === 'quoted' || status === 'scheduled' || status === 'rejected' || status !== inquiry.status) && status !== 'completed' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-gray-200 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : (
                status === 'quoted'    ? 'Save Quotation'    :
                status === 'scheduled' ? 'Confirm Schedule'  :
                status === 'rejected'  ? 'Confirm Rejection' : 'Update Status'
              )}
            </button>
          )}
        </div>

        {/* Local Confirmation within Modal */}
        <ModalConfirmAction 
          isOpen={!!localConfirm}
          onClose={() => setLocalConfirm(null)}
          {...localConfirm}
        />
      </div>
    </div>
  );
};

/* ─── Main Page ───────────────────────────────────────────────────────── */
const AdminInquiries = () => {
  const [inquiries,        setInquiries]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedInquiry,  setSelectedInquiry]  = useState(null);
  const [filterStatus,     setFilterStatus]     = useState('all');
  const [search,           setSearch]           = useState('');
  const [confirmData,     setConfirmData]      = useState(null);

  useEffect(() => { loadInquiries(); }, []);

  const loadInquiries = async () => {
    setLoading(true);
    try { const data = await fetchInquiries(); setInquiries(data); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleUpdateInquiry = async (id, data) => {
    try {
      await updateInquiryStatus(id, data);
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, ...data } : inq));
      if (selectedInquiry?.id === id) setSelectedInquiry(p => ({ ...p, ...data }));
    } catch { 
      // toast is handled in the child or we could add it here too
    }
  };

  const handleMarkPaid = async (id) => {
    setConfirmData({
      title: "Mark as Paid?",
      message: "This will record the payment and automatically mark the service as Completed. Proceed?",
      confirmText: "Yes, Mark Paid",
      type: 'success',
      onConfirm: async () => {
        try {
          const res = await markInquiryPaid(id);
          setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, ...res.data } : inq));
          if (selectedInquiry?.id === id) setSelectedInquiry(p => ({ ...p, ...res.data }));
          toast.success("Payment recorded and Inquiry Completed!");
        } catch { 
          toast.error('Failed to mark as paid.'); 
        }
      }
    });
  };

  const STATUS_TABS = ['all','pending','reviewed','quoted','approved','scheduled','in_progress','completed','rejected'];

  const filtered = inquiries.filter(inq => {
    const matchStatus = filterStatus === 'all' || inq.status === filterStatus;
    const matchSearch = !search || inq.customer_name?.toLowerCase().includes(search.toLowerCase()) || inq.id.toString().includes(search) || inq.service_type?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 px-8 py-7">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">Car Service Inquiries</h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{inquiries.length} total inquiries</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search customer, ID, service…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all w-64"
                />
              </div>
              {/* Refresh */}
              <button
                onClick={loadInquiries}
                className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition flex items-center justify-center text-gray-500"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_TABS.map(tab => {
              const count = tab === 'all' ? inquiries.length : inquiries.filter(i => i.status === tab).length;
              const active = filterStatus === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0
                    ${active ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {tab.replace(/_/g, ' ')}
                  {count > 0 && (
                    <span className={`text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1
                      ${active ? 'bg-[#FDE31E] text-black' : 'bg-gray-300 text-gray-600'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-[#FDE31E] rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Inquiries…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-gray-100 p-20 text-center shadow-sm">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">{search ? 'No results found' : 'No inquiries yet'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Date', 'Customer', 'Service', 'Details', 'Status', 'Payment', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inq => (
                  <tr key={inq.id} className="group hover:bg-gray-50/80 transition-colors duration-150">
                    {/* Date */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-800">{new Date(inq.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-black italic uppercase tracking-tighter text-gray-900 leading-none">{inq.customer_name}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{inq.contact_number}</p>
                    </td>

                    {/* Service */}
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-900 text-white">
                        {inq.service_type?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-gray-600 truncate max-w-[180px]">
                        {inq.service_type === 'car_wrap'
                          ? `${inq.car_type || ''} · ${inq.wrap_type || ''}`
                          : inq.decal_type || inq.motor_model || '—'}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={inq.status} />
                    </td>

                    {/* Payment */}
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        inq.payment_status === 'paid'    ? 'text-emerald-500' :
                        inq.payment_status === 'partial' ? 'text-amber-500'   : 'text-red-400'
                      }`}>
                        {inq.payment_status || 'unpaid'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedInquiry(inq)}
                        className="w-9 h-9 rounded-2xl bg-gray-50 border border-gray-200 hover:bg-[#FDE31E] hover:border-[#FDE31E] transition-all flex items-center justify-center text-gray-400 hover:text-black group/btn"
                      >
                        <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onSave={handleUpdateInquiry}
          onMarkPaid={handleMarkPaid}
        />
      )}

      {/* Confirmation Modal */}
      <ModalConfirmAction 
        isOpen={!!confirmData}
        onClose={() => setConfirmData(null)}
        {...confirmData}
      />
    </div>
  );
};

export default AdminInquiries;