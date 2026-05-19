import React, { useState, useEffect } from "react";
import { addDesign, removeDesign } from "../../services/ProductsService";
import { getImageUrl } from "../../services/api";

export default function ProductVariationsModal({ product, onClose }) {
  const [designs, setDesigns] = useState(product.designs || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [newDesignName, setNewDesignName] = useState("");
  const [newDesignPrice, setNewDesignPrice] = useState("0");
  const [newDesignImage, setNewDesignImage] = useState(null);
  const [newDesignImagePreview, setNewDesignImagePreview] = useState(null);

  // Sync designs if product changes
  useEffect(() => {
    setDesigns(product.designs || []);
  }, [product]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewDesignImage(file);
      setNewDesignImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddDesign = async (e) => {
    e.preventDefault();
    if (!newDesignName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("design_name", newDesignName.trim());
      formData.append("additional_price", parseFloat(newDesignPrice) || 0);
      if (newDesignImage) {
        formData.append("design_image", newDesignImage);
      }

      const res = await addDesign(product.product_id || product.id, formData);
      setDesigns([...designs, res.data]);
      setNewDesignName("");
      setNewDesignPrice("0");
      setNewDesignImage(null);
      setNewDesignImagePreview(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add design");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDesign = async (id) => {
    if (!window.confirm("Are you sure you want to remove this design?")) return;
    setLoading(true);
    setError(null);
    try {
      await removeDesign(id);
      setDesigns(designs.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove design");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transform scale-100 transition-all duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Ready-Made Designs</h2>
            <p className="text-xs text-gray-500 mt-0.5">Product: <span className="font-semibold text-gray-700">{product.name || product.product_name}</span></p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Form panel */}
            <form onSubmit={handleAddDesign} className="bg-gray-50 p-5 rounded-2xl space-y-4 border border-gray-100 md:sticky md:top-0">
              <h3 className="font-bold text-gray-800 text-sm">Add New Design</h3>
              
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Design Name</label>
                <input
                  type="text"
                  required
                  value={newDesignName}
                  onChange={e => setNewDesignName(e.target.value)}
                  placeholder="e.g. Naruto Chibi"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black transition-all bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Additional Price (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newDesignPrice}
                  onChange={e => setNewDesignPrice(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black transition-all bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1.5">Design Preview Image</label>
                <div className="relative group border-2 border-dashed border-gray-200 hover:border-gray-400 rounded-xl overflow-hidden min-h-[140px] flex flex-col items-center justify-center bg-white transition-all">
                  {newDesignImagePreview ? (
                    <>
                      <img src={newDesignImagePreview} className="w-full h-32 object-cover" alt="Preview" />
                      <button
                        type="button"
                        onClick={() => { setNewDesignImage(null); setNewDesignImagePreview(null); }}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 text-xs hover:bg-red-700 shadow-md transition-colors"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-2xl block mb-1">📤</span>
                      <span className="text-[11px] text-gray-500 font-bold block mb-1">Upload WebP/PNG/JPG</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Design"}
              </button>
            </form>

            {/* List panel */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-gray-800 text-sm">Existing Designs ({designs.length})</h3>
              {designs.length === 0 ? (
                <p className="text-gray-400 italic text-sm py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No ready-made designs added yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {designs.map(d => (
                    <div key={d.id} className="flex gap-3.5 p-3 rounded-xl border border-gray-100 bg-white items-center group shadow-sm hover:border-gray-200 transition-all">
                      <img 
                        src={getImageUrl(d.design_image)} 
                        className="w-14 h-14 rounded-lg object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                        alt={d.design_name}
                        onError={(e) => { e.target.src = "https://placehold.co/100x100?text=No+Image"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{d.design_name}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                          {parseFloat(d.additional_price) > 0 ? `+ ₱${parseFloat(d.additional_price).toFixed(2)}` : "Standard Price"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDesign(d.id)}
                        disabled={loading}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-wider"
          >
            Close & Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
