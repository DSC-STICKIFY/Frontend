import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { submitInquiry } from "../../services/InquiryAPI";
import { useAuth } from "../../context/CustomerAuthContext";
import LoginRegisterModal from "../LoginRegisterModal";
import { getImageUrl, PLACEHOLDER_IMAGE } from "../../services/api";

const ModalMotorServiceInquiry = ({ onClose, product }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() : "",
    contact_number: currentUser?.contact_number || "",
    email: currentUser?.email || "",
    address: currentUser?.address || "",
    message: "",
    motor_model: product?.product_name || "",
    color_style: "",
    schedule_date: "",
  });

  // Sync with currentUser if they login while modal is open
  // Sync with currentUser if they login while modal is open
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        customer_name: `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim(),
        contact_number: currentUser.contact_number || prev.contact_number,
        email: currentUser.email || prev.email,
        address: currentUser.address || prev.address,
      }));
    }
  }, [currentUser]);

  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    let errs = {};
    if (!formData.finish_type) errs.finish_type = "This field is required";
    if (!formData.color_style) errs.color_style = "This field is required";
    if (!formData.schedule_date) errs.schedule_date = "This field is required";
    if (currentUser) {
      if (!formData.contact_number) errs.contact_number = "This field is required";
      if (!formData.address) errs.address = "This field is required";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!currentUser) {
      // Save form data for auto-submit after login
      sessionStorage.setItem("stickify_pending_inquiry", JSON.stringify({
        ...formData,
        service_type: "motor_service",
        category: "Motor"
      }));

      if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          sessionStorage.setItem("stickify_pending_inquiry_image", e.target.result);
        };
        reader.readAsDataURL(imageFile);
      }

      setShowAuthModal(true);
      return;
    }
    setIsSubmitting(true);
    setErrors({});

    const data = new FormData();
    data.append("service_type", "motor_service");
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });
    if (imageFile) data.append("image", imageFile);

    try {
      await submitInquiry(data);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        navigate("/customer-inquiries");
      }, 2000);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert("Failed to submit inquiry. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black italic uppercase mb-2">Ride Ready!</h2>
          <p className="text-gray-500 mb-8">Your motor service inquiry has been received. Our team will contact you for a quote.</p>
          <button
            onClick={onClose}
            className="w-full bg-[#FDE31E] py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-yellow-400 transition shadow-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full p-8 md:p-12 relative my-auto">
          <button onClick={onClose} className="absolute top-8 right-10 text-3xl font-bold text-gray-300 hover:text-black">×</button>

          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-1 bg-[#FDE31E] rounded-full"></div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900">
              Motorbike Inquiry
            </h2>
          </div>
          {product?.product_description && (
            <p className="text-sm text-gray-500 mb-6 italic leading-relaxed px-1">
              {product.product_description}
            </p>
          )}

          {/* Product Image Display */}
          <div className="mb-8">
            <div className="relative aspect-video bg-gray-50 rounded-[28px] overflow-hidden border border-gray-100 shadow-sm group max-w-md mx-auto">
              <img
                src={getImageUrl(product?.product_image)}
                alt={product?.product_name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
              />
              <div className="absolute top-3 left-3 bg-gray-900 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase italic shadow-sm">Sample Design</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Motorbike Model</p>
                <p className="text-xl font-black italic uppercase tracking-tighter text-gray-900">{product?.product_name || "Custom Motorbike"}</p>
              </div>

              {/* Finish Type Selection */}
              <div className="md:col-span-2 space-y-4">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Select Finish Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-3">
                  {["Wrap", "Glossy", "Hologram"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, finish_type: type });
                        if (formErrors.finish_type) setFormErrors({ ...formErrors, finish_type: null });
                      }}
                      className={`p-4 rounded-2xl border-2 font-black uppercase italic tracking-tighter text-xs transition-all hover:scale-[1.02] active:scale-95 ${formData.finish_type === type ? "border-[#FDE31E] bg-yellow-50 text-black shadow-md" : "border-gray-100 text-gray-400 hover:border-yellow-400 hover:bg-yellow-50/30"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {formErrors.finish_type && <p className="text-red-500 text-[10px] font-black uppercase">{formErrors.finish_type}</p>}
                {errors.finish_type && <p className="text-red-500 text-[10px] font-black uppercase">{errors.finish_type[0]}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Color Preference <span className="text-red-500">*</span></label>
                <input name="color_style" value={formData.color_style} onChange={handleChange} placeholder="e.g. Matte Black" className={`w-full p-4 rounded-2xl border-2 outline-none font-bold ${formErrors.color_style ? "border-red-500" : "border-gray-50 focus:border-[#FDE31E]"}`} />
                {formErrors.color_style && <p className="text-red-500 text-[10px] font-black uppercase mt-1">{formErrors.color_style}</p>}
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preferred Appointment Date & Time <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  name="schedule_date"
                  value={formData.schedule_date}
                  onChange={handleChange}
                  className={`w-full p-4 rounded-2xl border-2 outline-none font-bold ${formErrors.schedule_date ? "border-red-500" : "border-gray-50 focus:border-[#FDE31E]"}`}
                />
                {formErrors.schedule_date && <p className="text-red-500 text-[10px] font-black uppercase mt-1">{formErrors.schedule_date}</p>}
                <p className="text-[9px] text-gray-400 font-bold italic uppercase mt-1">Note: This is subject to availability and confirmation.</p>
              </div>

              {currentUser && (
                <>
                  <div className="md:col-span-2 flex justify-between items-end border-b border-gray-100 pb-2 mb-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 italic">Customer Information</h3>
                    {!isEditingProfile ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="text-[10px] font-black text-yellow-500 uppercase hover:underline"
                      >
                        Edit information
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="text-[10px] font-black text-green-500 uppercase hover:underline"
                      >
                        Save Changes
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customer Name <span className="text-red-500">*</span></label>
                    <input name="customer_name" value={formData.customer_name} onChange={handleChange} readOnly={true} className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 text-gray-500 cursor-not-allowed outline-none font-bold" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contact Number <span className="text-red-500">*</span></label>
                    <input name="contact_number" value={formData.contact_number} onChange={handleChange} readOnly={!isEditingProfile} placeholder="09XX XXX XXXX" className={`w-full p-4 rounded-2xl border-2 outline-none font-bold ${(!isEditingProfile) ? 'bg-gray-50 border-gray-50 text-gray-500 cursor-not-allowed' : (formErrors.contact_number ? 'border-red-500' : 'border-gray-50 focus:border-[#FDE31E]')}`} />
                    {formErrors.contact_number && <p className="text-red-500 text-[10px] font-black uppercase mt-1">{formErrors.contact_number}</p>}
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address <span className="text-red-500">*</span></label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} readOnly={true} className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 text-gray-500 cursor-not-allowed outline-none font-bold" />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Address <span className="text-red-500">*</span></label>
                    <input name="address" value={formData.address} onChange={handleChange} readOnly={!isEditingProfile} placeholder="e.g. Brgy. 1, City, Province" className={`w-full p-4 rounded-2xl border-2 outline-none font-bold ${(!isEditingProfile) ? 'bg-gray-50 border-gray-50 text-gray-500 cursor-not-allowed' : (formErrors.address ? 'border-red-500' : 'border-gray-50 focus:border-[#FDE31E]')}`} />
                    {formErrors.address && <p className="text-red-500 text-[10px] font-black uppercase mt-1">{formErrors.address}</p>}
                  </div>
                </>
              )}

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Message / Additional Details</label>
                <textarea name="message" value={formData.message} onChange={handleChange} rows="3" placeholder="Tell us more about your request..." className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold resize-none"></textarea>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reference Photo (Optional)</label>
                <input type="file" onChange={(e) => setImageFile(e.target.files[0])} className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#FDE31E] py-6 rounded-3xl font-black uppercase italic tracking-widest text-sm hover:bg-yellow-400 transition-all shadow-xl  active:scale-95 disabled:bg-gray-100 disabled:text-gray-300"
            >
              {isSubmitting ? "Submitting..." : "Send Motor Inquiry"}
            </button>
          </form>
        </div>
      </div>
      {showAuthModal && (
        <LoginRegisterModal onClose={() => setShowAuthModal(false)} isInquiry={true} />
      )}
    </>
  );
};

export default ModalMotorServiceInquiry;
