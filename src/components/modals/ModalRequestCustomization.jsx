import React, { useState } from "react";
import { X, Upload, Send, Sparkles, MessageCircle, HelpCircle } from "lucide-react";
import { submitCustomizationRequest } from "../../services/CustomizationAPI";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ModalRequestCustomization({ product, onClose }) {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState(product?.sizes?.[0]?.size_name || "3x3 inches");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [instructions, setInstructions] = useState("");
  const [refImage, setRefImage] = useState(null);
  const [refImagePreview, setRefImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRefImage(file);
      setRefImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalSize = product?.category === "Signage"
      ? `${customWidth || 1} x ${customHeight || 1} ft`
      : size;

    const formData = new FormData();
    formData.append("product_id", product.id || product.product_id || "");
    formData.append("product_name", product.title || product.product_name || "Custom Item");
    formData.append("quantity", quantity);
    formData.append("size_requested", finalSize);
    formData.append("instructions", instructions);
    if (refImage) {
      formData.append("reference_image", refImage);
    }

    setIsSubmitting(true);
    try {
      await submitCustomizationRequest(formData);
      toast.success("Customization request submitted! Our staff will validate and quote your request soon.");
      onClose();
      navigate("/customer-inquiries", { state: { openCustomizations: true } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div
        className="bg-white sm:rounded-[36px] rounded-t-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative"
        style={{ maxHeight: "93vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-yellow-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Request Customization</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Configure specifications for {product?.title || product?.product_name}
              </p>
            </div>
          </div>
          {/* Close — spins + darkens */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center
              transition-all duration-200
              hover:bg-gray-900 hover:rotate-90 hover:scale-110
              active:scale-95"
          >
            <X className="w-4 h-4 text-gray-500 transition-colors duration-200 group-hover:text-white [button:hover_&]:text-white" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 space-y-5 custom-scrollbar">

          {/* Price to be Quoted badge */}
          <div className="bg-yellow-50/60 border border-yellow-100 rounded-2xl p-4 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black text-yellow-700 uppercase tracking-wider">Price to be quoted</h4>
              <p className="text-[11px] text-yellow-600 font-semibold mt-1 leading-relaxed">
                Custom products do not have fixed pricing. Our staff will review your specifications and provide a detailed quotation before any production starts.
              </p>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Quantity</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-2">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center font-bold text-gray-400 rounded-xl
                  transition-all duration-150
                  hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110
                  active:scale-95
                  disabled:opacity-40"
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-transparent text-center font-black text-gray-900 text-lg border-none outline-none focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 flex items-center justify-center font-bold text-gray-400 rounded-xl
                  transition-all duration-150
                  hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110
                  active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Size Configuration */}
          {product?.category === "Signage" ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Dimensions (ft)</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Width"
                    min="0.1"
                    step="any"
                    required
                    value={customWidth}
                    onChange={e => setCustomWidth(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 font-bold text-gray-800
                      focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
                      transition-all duration-150 hover:border-yellow-200"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">ft W</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Height"
                    min="0.1"
                    step="any"
                    required
                    value={customHeight}
                    onChange={e => setCustomHeight(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 font-bold text-gray-800
                      focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
                      transition-all duration-150 hover:border-yellow-200"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">ft H</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Size Option</label>
              {product?.sizes && product.sizes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(sObj => (
                    <button
                      type="button"
                      key={sObj.id}
                      onClick={() => setSize(sObj.size_name)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold
                        transition-all duration-200
                        hover:-translate-y-0.5 hover:shadow-sm active:scale-95
                        ${size === sObj.size_name
                          ? "border-yellow-400 bg-yellow-50 text-yellow-900 shadow-sm shadow-yellow-100"
                          : "border-gray-100 bg-white text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/30"
                        }`}
                    >
                      {sObj.size_name}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. 3x3 inches"
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 font-bold text-gray-800
                    focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
                    transition-all duration-150 hover:border-yellow-200"
                />
              )}
            </div>
          )}

          {/* Reference Image Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Reference / Logo Image</label>
            <div className="relative border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50
              transition-all duration-200
              hover:border-yellow-400 hover:bg-yellow-50/20 hover:shadow-sm">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              {refImagePreview ? (
                <div className="p-4 flex flex-col items-center gap-2">
                  <img src={refImagePreview} className="max-h-40 object-contain rounded-xl shadow-sm border border-gray-100" alt="Preview" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{refImage?.name}</p>
                  <span className="text-[10px] text-yellow-600 font-black uppercase tracking-wider">Click to Change</span>
                </div>
              ) : (
                <div className="p-7 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400
                    transition-all duration-200 group-hover:bg-yellow-100 group-hover:text-yellow-500">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-700 uppercase tracking-wide">Upload Design Reference</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">PNG, JPG or JPEG up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Customization Instructions</label>
            <textarea
              rows="4"
              required
              placeholder="Describe color preferences, text, sticker finishes, design ideas..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 font-bold text-sm text-gray-800 placeholder:text-gray-300
                focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
                transition-all duration-150 hover:border-yellow-200
                resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`group/submit w-full py-5 rounded-[20px] font-black uppercase tracking-widest text-xs
              flex items-center justify-center gap-2.5
              transition-all duration-200 active:scale-[0.97]
              ${isSubmitting
                ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
                : "bg-[#FFE100] text-black shadow-xl shadow-yellow-200/60 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50"
              }`}
          >
            <Send className="w-4 h-4 transition-transform duration-200 group-hover/submit:translate-x-0.5 group-hover/submit:-translate-y-0.5" />
            {isSubmitting ? "Submitting Request..." : "Submit Customization Request"}
          </button>

          <div className="h-1" />
        </form>
      </div>
    </div>
  );
}