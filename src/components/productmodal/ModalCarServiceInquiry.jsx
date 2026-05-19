import React, { useState, useEffect , useRef} from "react";
import { useNavigate } from "react-router-dom";
import { submitInquiry } from "../../services/InquiryAPI";
import { useAuth } from "../../context/CustomerAuthContext";
import LoginRegisterModal from "../LoginRegisterModal";
import { getImageUrl, PLACEHOLDER_IMAGE } from "../../services/api";

const ModalCarServiceInquiry = ({ onClose, product }) => {
  const rightPanelRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rightPanelRef.current) {
        rightPanelRef.current.scrollTop = 0;
        // Also scroll the window/body just in case
        window.scrollTo(0, 0);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState(""); // car_wrap, car_decal
  const [formData, setFormData] = useState({
    customer_name: currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() : "",
    contact_number: currentUser?.contact_number || "",
    email: currentUser?.email || "",
    address: currentUser?.address || "",
    message: "",
    car_type: product?.product_name || "",
    wrap_type: "",
    decal_type: "",
    placement: "",
    size: "",
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

  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Removed automatic auth modal trigger. User can fill the form as guest first.

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      // Save form data for auto-submit after login
      sessionStorage.setItem("stickify_pending_inquiry", JSON.stringify({
        ...formData,
        service_type: serviceType,
        category: "Car"
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
    data.append("service_type", serviceType);
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
          <h2 className="text-2xl font-black italic uppercase mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-8">Your inquiry has been submitted. We will contact you shortly.</p>
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

          <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-1 border-b-4 border-[#FDE31E] w-fit pb-1">
            Service Inquiry
          </h2>
          {product?.product_description && (
            <p className="text-sm text-gray-500 mb-6 italic leading-relaxed">
              {product.product_description}
            </p>
          )}

          {/* Product Images Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="relative aspect-video bg-gray-50 rounded-[28px] overflow-hidden border border-gray-100 shadow-sm group">
              <img
                src={getImageUrl(product?.price_map_image)}
                alt="Price Map"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
              />
              <div className="absolute top-3 left-3 bg-yellow-400 text-black text-[9px] px-3 py-1 rounded-full font-black uppercase italic shadow-sm">Price Map</div>
            </div>
            <div className="relative aspect-video bg-gray-50 rounded-[28px] overflow-hidden border border-gray-100 shadow-sm group">
              <img
                src={getImageUrl(product?.product_image)}
                alt="Sample"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
              />
              <div className="absolute top-3 left-3 bg-gray-900 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase italic shadow-sm">Sample</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Type Selection */}
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Select Service Type <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setServiceType("car_wrap")}
                  className={`p-6 rounded-3xl border-2 font-black uppercase italic tracking-widest text-sm transition-all ${serviceType === "car_wrap" ? "border-[#FDE31E] bg-yellow-50 text-black shadow-lg" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                >
                  Car Wrap
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType("car_decal")}
                  className={`p-6 rounded-3xl border-2 font-black uppercase italic tracking-widest text-sm transition-all ${serviceType === "car_decal" ? "border-[#FDE31E] bg-yellow-50 text-black shadow-lg" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                >
                  Car Decal
                </button>
              </div>
            </div>

            {serviceType && (
              <>
                {/* Dynamic Fields */}
                {serviceType === "car_wrap" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Car Type</label>
                      <input name="car_type" value={formData.car_type} onChange={handleChange} placeholder="e.g. Sedan, SUV, etc." className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wrap Type</label>
                      <select name="wrap_type" value={formData.wrap_type} onChange={handleChange} className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold">
                        <option value="">Select Wrap Type</option>
                        <option value="Full Wrap">Full Wrap</option>
                        <option value="Partial Wrap">Partial Wrap</option>
                        <option value="Roof Wrap">Roof Wrap</option>
                        <option value="Hood Wrap">Hood Wrap</option>
                        <option value="Dechroming">Dechroming</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preferred Color / Style</label>
                      <input name="color_style" value={formData.color_style} onChange={handleChange} placeholder="e.g. Matte Black, Glossy Red, etc." className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Decal Type</label>
                      <input name="decal_type" value={formData.decal_type} onChange={handleChange} placeholder="e.g. Racing Stripes, Graphics" className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Placement</label>
                      <input name="placement" value={formData.placement} onChange={handleChange} placeholder="e.g. Sides, Hood, Rear" className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Size</label>
                      <input name="size" value={formData.size} onChange={handleChange} placeholder="e.g. 24x36 inches" className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold" />
                    </div>
                  </div>
                )}
                {/* Shared Fields - Schedule & Message */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <input name="customer_name" required value={formData.customer_name} onChange={handleChange} readOnly={true} className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 text-gray-500 cursor-not-allowed outline-none font-bold" />
                        {errors.customer_name && <p className="text-red-500 text-[10px] font-black uppercase">{errors.customer_name[0]}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contact Number <span className="text-red-500">*</span></label>
                        <input name="contact_number" required value={formData.contact_number} onChange={handleChange} readOnly={!isEditingProfile} className={`w-full p-4 rounded-2xl border-2 outline-none font-bold ${(!isEditingProfile) ? 'bg-gray-50 border-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-50 focus:border-[#FDE31E]'}`} />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address <span className="text-red-500">*</span></label>
                        <input type="email" name="email" required value={formData.email} onChange={handleChange} readOnly={true} className="w-full p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 text-gray-500 cursor-not-allowed outline-none font-bold" />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Address <span className="text-red-500">*</span></label>
                        <input name="address" required value={formData.address} onChange={handleChange} readOnly={!isEditingProfile} placeholder="e.g. Brgy. 1, City, Province" className={`w-full p-4 rounded-2xl border-2 outline-none font-bold ${(!isEditingProfile) ? 'bg-gray-50 border-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-50 focus:border-[#FDE31E]'}`} />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preferred Appointment Date & Time <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      name="schedule_date"
                      required
                      value={formData.schedule_date}
                      onChange={handleChange}
                      className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold"
                    />
                    <p className="text-[9px] text-gray-400 font-bold italic uppercase mt-1">Note: This is subject to availability and confirmation.</p>
                  </div>


                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Car Photo / Design (Optional)</label>
                    <input type="file" onChange={(e) => setImageFile(e.target.files[0])} className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-400" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Message / Additional Notes</label>
                    <textarea name="message" value={formData.message} onChange={handleChange} rows="3" className="w-full p-4 rounded-2xl border-2 border-gray-50 focus:border-[#FDE31E] outline-none font-bold resize-none"></textarea>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !imageFile}
                  className={`w-full py-6 rounded-[28px] font-black uppercase italic tracking-widest text-sm transition-all shadow-xl active:scale-95
                    ${(isSubmitting || !imageFile) ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-[#FDE31E] text-black hover:bg-yellow-400"}`}
                >
                  {!imageFile ? "Upload Photo to Proceed" : (isSubmitting ? "Submitting..." : "Send Inquiry Now")}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
      {showAuthModal && (
        <LoginRegisterModal onClose={() => setShowAuthModal(false)} isInquiry={true} />
      )}
    </>
  );
};

export default ModalCarServiceInquiry;
