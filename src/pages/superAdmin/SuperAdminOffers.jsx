import React, { useState, useEffect } from "react";
import remove   from "../../assets/delete.svg";
import publish  from "../../assets/publish.svg";
import upublish from "../../assets/upublish.svg";
import { fetchAllProducts } from "../../services/ProductsService";
import { toArray }          from "../../services/api";
import PromoApi             from "../../services/PromoApi";
import sendIcon             from "../../assets/send.svg";

const CATEGORIES = [
  "Stickers","Decals & Wrap","Signage","Giveaways","Printing","Graphic Services",
];

const TYPES_BY_CATEGORY = {
  Stickers:           ["Hologram", "Glossy", "Matte", "Transparent", "Glitter", "Scratch", "Cut out", "Visor", "Assorted"],
  "Decals & Wrap":    ["Car Service Layout", "Motor Service Layout", "Car Wrap", "Motorbike Decal", "Full Wrap", "Partial Wrap", "Window Decal"],
  Signage:            ["Acrylic Signage", "Neon Lights Signage", "Panaflex Signage"],
  Giveaways:          ["Keychain", "ID Lace", "T-Shirt", "Calling Cards", "Caps", "Mugs", "Tarpulin", "Sintra Board"],
  Printing:           ["Flyers", "Brochures", "Business Cards", "Posters", "Banners"],
  "Graphic Services": ["Business Logo", "Moto Vlog Logo"],
};

const EMPTY_PRODUCT_FORM = {
  name: "", description: "", discount_type: "percentage", discount_value: "",
  min_quantity: "", start_date: "", end_date: "",
  usage_limit: "", status: "active", display_type: "product",
  applicable_to: "all", applicable_ids: [], applicable_category_filter: "",
};

const EMPTY_CHECKOUT_FORM = {
  name: "", description: "", discount_type: "percentage", discount_value: "",
  min_amount: "", max_discount: "", end_date: "", usage_limit: "",
  status: "active", display_type: "checkout",
  applicable_to: "all", applicable_ids: [],
};

const SuperAdminOffers = () => {
  const [activeTab, setActiveTab]       = useState("product");
  const [promos, setPromos]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [filter, setFilter]             = useState("");
  const [productForm, setProductForm]   = useState(EMPTY_PRODUCT_FORM);
  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT_FORM);
  const [products, setProducts]         = useState([]);
  const [fetchingProducts, setFetchingProducts] = useState(false);

  const loadPromos = async () => {
    setLoading(true);
    try {
      const data = await PromoApi.getAll();
      setPromos(Array.isArray(data) ? data : []);
    } catch {
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    setFetchingProducts(true);
    try {
      const res  = await fetchAllProducts();
      const flat = toArray(res);
      setProducts(flat.map((p) => ({ id: p.product_id, name: p.product_name })));
    } catch {
      setProducts([]);
    } finally {
      setFetchingProducts(false);
    }
  };

  useEffect(() => { loadPromos(); }, []);

  useEffect(() => {
    if (productForm.applicable_to === "products") loadProducts();
  }, [productForm.applicable_to]);

  const handleProductChange  = (e) => setProductForm((p)  => ({ ...p,  [e.target.name]: e.target.value }));
  const handleCheckoutChange = (e) => setCheckoutForm((p) => ({ ...p,  [e.target.name]: e.target.value }));

  const handleCreate = async (formData, resetFn) => {
  console.log("SUBMITTING display_type:", formData.display_type); // ✅ idugang ni
  console.log("FULL PAYLOAD:", formData);
    if (!formData.name || !formData.discount_type) {
      alert("Please fill out Name and Discount Type.");
      return;
    }
    if (formData.discount_type !== "free_shipping" && !formData.discount_value) {
      alert("Please provide a Discount Value.");
      return;
    }
    if (formData.applicable_to !== "all" && formData.applicable_ids.length === 0) {
      alert(`Please select a ${formData.applicable_to === "types" ? "type" : "product"}.`);
      return;
    }

    setSaving(true);
    try {
      await PromoApi.create({
        name:           formData.name.trim(),
        description:    formData.description?.trim() || null,
        display_type:   formData.display_type,        
        discount_type:  formData.discount_type,
        discount_value: formData.discount_type === "free_shipping" ? 0 : parseFloat(formData.discount_value),
        min_quantity:   formData.min_quantity  ? parseInt(formData.min_quantity)   : null,
        min_amount:     formData.min_amount    ? parseFloat(formData.min_amount)   : null, // ✅ idugang
        max_discount:   formData.max_discount  ? parseFloat(formData.max_discount) : null, // ✅ idugang
        start_date:     formData.start_date    || null,
        end_date:       formData.end_date      || null,
        usage_limit:    formData.usage_limit   ? parseInt(formData.usage_limit)    : null,
        status:         formData.status,
        applicable_to:  formData.applicable_to,
        applicable_ids: formData.applicable_ids,
      });
      resetFn();
      await loadPromos();
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (promo) => {
    const newStatus = promo.status === "active" ? "inactive" : "active";
    try {
      await PromoApi.update(promo.id, { status: newStatus });
      setPromos((prev) => prev.map((p) => p.id === promo.id ? { ...p, status: newStatus } : p));
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this promotion?")) return;
    try {
      await PromoApi.remove(id);
      setPromos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };
  
  const [notifyingIds, setNotifyingIds] = useState([]);
  const handleNotify = async (id) => {
    setNotifyingIds((prev) => [...prev, id]);
    try {
      const res = await PromoApi.notify(id);
      alert(res.message || "Notification sent!");
    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setNotifyingIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const filteredPromos = promos.filter((p) => {
    if (p.display_type !== activeTab) return false;
    if (filter && p.discount_type !== filter) return false;
    return true;
  });

  const formatDiscount = (promo) => {
    if (promo.discount_type === "percentage")   return `${promo.discount_value}%`;
    if (promo.discount_type === "free_shipping") return "Free Shipping";
    return `₱${Number(promo.discount_value).toLocaleString("en-PH")}`;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getScopeLabel = (promo) => {
    if (promo.applicable_to === "types") {
      const count = promo.applicable_ids?.length || 0;
      return count === 1 ? `Type: ${promo.applicable_ids[0]}` : `${count} Types`;
    }
    if (promo.applicable_to === "products") {
      const count = promo.applicable_ids?.length || 0;
      return count === 1 ? "1 Product" : `${count} Products`;
    }
    return "Global";
  };

  const inputCls = "border border-[#DCDCDC] rounded-xl px-3 text-sm h-10 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <div className="p-3 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col">
      <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Offers & Promotions</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: "product",  label: "🏷 Product Promotions" },
          { key: "checkout", label: "🛒 Checkout Vouchers"  },
        ].map(({ key, label }) => (
          <button key={key}
            onClick={() => { setActiveTab(key); setFilter(""); }}
            className={`pb-3 px-4 text-sm font-bold transition border-b-2 ${
              activeTab === key
                ? "border-yellow-400 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PRODUCT PROMO FORM ── */}
      {activeTab === "product" && (
        <div className="mb-6 p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
          <p className="text-xs font-bold text-gray-400 uppercase mb-4">
            New Product Promotion 
          </p>

          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Discount Type*</p>
              <select name="discount_type" value={productForm.discount_type} onChange={handleProductChange} className={`${inputCls} w-44`}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            {productForm.discount_type !== "free_shipping" && (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  {productForm.discount_type === "percentage" ? "Discount %*" : "Discount (₱)*"}
                </p>
                <input type="number" name="discount_value" value={productForm.discount_value}
                  onChange={handleProductChange} placeholder="e.g. 20" className={`${inputCls} w-40`} />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Usage Limit</p>
              <input type="number" name="usage_limit" value={productForm.usage_limit}
                onChange={handleProductChange} placeholder="e.g. 100" className={`${inputCls} w-32`} />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Valid Until</p>
              <input type="date" name="end_date" value={productForm.end_date}
                onChange={handleProductChange} className={`${inputCls} w-44`} />
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Promo Name*</p>
              <input type="text" name="name" value={productForm.name}
                onChange={handleProductChange} placeholder="Enter promo name"
                className={`${inputCls} w-full font-bold`} />
            </div>

            <button onClick={() => handleCreate(productForm, () => setProductForm(EMPTY_PRODUCT_FORM))}
              disabled={saving}
              className="h-10 px-6 bg-[#FDE31E] hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition shadow-sm active:scale-95 disabled:opacity-50">
              {saving ? "..." : "Create"}
            </button>
          </div>

          {/* Description */}
          <div className="mt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p>
            <textarea name="description" value={productForm.description} onChange={handleProductChange}
              placeholder="e.g. Get 20% off on all stickers!"
              className="p-3 border border-[#DCDCDC] rounded-xl text-sm w-full max-w-2xl h-20 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          </div>

          {/* Apply To */}
          <div className="flex flex-wrap gap-6 mt-4 items-start">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Apply To</p>
              <div className="flex gap-4">
                {[
                  { val: "all",      label: "All Products"    },
                  { val: "types",    label: "Specific Type"   },
                  { val: "products", label: "Specific Product"},
                ].map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="radio" name="applicable_to" value={val}
                      checked={productForm.applicable_to === val}
                      onChange={(e) => setProductForm((prev) => ({
                        ...prev,
                        applicable_to: e.target.value,
                        applicable_ids: [],
                        applicable_category_filter: "",
                      }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {productForm.applicable_to === "types" && (
              <div className="flex gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Category</p>
                  <select value={productForm.applicable_category_filter}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, applicable_category_filter: e.target.value, applicable_ids: [] }))}
                    className={`${inputCls} w-52`}>
                    <option value="">-- Select Category --</option>
                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                {productForm.applicable_category_filter && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Select Type</p>
                    <select value={productForm.applicable_ids[0] || ""}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, applicable_ids: e.target.value ? [e.target.value] : [] }))}
                      className={`${inputCls} w-64`}>
                      <option value="">-- Select Type --</option>
                      {(TYPES_BY_CATEGORY[productForm.applicable_category_filter] || []).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {productForm.applicable_to === "products" && (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Select Product</p>
                <select value={productForm.applicable_ids[0] || ""}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, applicable_ids: e.target.value ? [e.target.value] : [] }))}
                  disabled={fetchingProducts}
                  className={`${inputCls} w-72`}>
                  <option value="">-- Select a Product --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {fetchingProducts && <p className="text-[10px] text-gray-400">Loading products...</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT VOUCHER FORM ── */}
      {activeTab === "checkout" && (
        <div className="mb-6 p-4 border border-blue-100 rounded-2xl bg-blue-50/30">
          <p className="text-xs font-bold text-blue-400 uppercase mb-4">
            New Checkout Voucher
          </p>

          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Discount Type*</p>
              <select name="discount_type" value={checkoutForm.discount_type} onChange={handleCheckoutChange} className={`${inputCls} w-44`}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            {checkoutForm.discount_type !== "free_shipping" && (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  {checkoutForm.discount_type === "percentage" ? "Discount %*" : "Discount (₱)*"}
                </p>
                <input type="number" name="discount_value" value={checkoutForm.discount_value}
                  onChange={handleCheckoutChange} placeholder="e.g. 50" className={`${inputCls} w-40`} />
              </div>
            )}

            {checkoutForm.discount_type === "percentage" && (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Max Discount (₱)</p>
                <input type="number" name="max_discount" value={checkoutForm.max_discount}
                  onChange={handleCheckoutChange} placeholder="e.g. 200" className={`${inputCls} w-40`} />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Min. Spend (₱)*</p>
              <input type="number" name="min_amount" value={checkoutForm.min_amount}
                onChange={handleCheckoutChange} placeholder="e.g. 500" className={`${inputCls} w-40`} />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Usage Limit</p>
              <input type="number" name="usage_limit" value={checkoutForm.usage_limit}
                onChange={handleCheckoutChange} placeholder="e.g. 100" className={`${inputCls} w-32`} />
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Valid Until</p>
              <input type="date" name="end_date" value={checkoutForm.end_date}
                onChange={handleCheckoutChange} className={`${inputCls} w-44`} />
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Voucher Name*</p>
              <input type="text" name="name" value={checkoutForm.name}
                onChange={handleCheckoutChange} placeholder="e.g. SAVE50"
                className={`${inputCls} w-full font-bold`} />
            </div>

            <button onClick={() => handleCreate(checkoutForm, () => setCheckoutForm(EMPTY_CHECKOUT_FORM))}
              disabled={saving}
              className="h-10 px-6 bg-[#FDE31E] hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition shadow-sm active:scale-95 disabled:opacity-50">
              {saving ? "..." : "Create"}
            </button>
          </div>

          {/* Description */}
          <div className="mt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p>
            <textarea name="description" value={checkoutForm.description} onChange={handleCheckoutChange}
              placeholder="e.g. Save ₱50 on orders above ₱500!"
              className="p-3 border border-[#DCDCDC] rounded-xl text-sm w-full max-w-2xl h-20 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          </div>
        </div>
      )}

      {/* ── TABLE ── */}
      <div className="flex flex-col w-full overflow-hidden flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm mt-2">
        <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase">
            {activeTab === "product" ? "Product Promotions" : "Checkout Vouchers"}
          </p>
          <select className="text-xs font-black bg-white border border-gray-100 px-3 py-1.5 rounded-xl"
            onChange={(e) => setFilter(e.target.value)} value={filter}>
            <option value="">All Types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
            <option value="free_shipping">Free Shipping</option>
          </select>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-50/50 sticky top-0 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left   text-[10px] font-bold text-gray-400 uppercase">Name</th>
                <th className="px-6 py-4 text-left   text-[10px] font-bold text-gray-400 uppercase">Type</th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Discount</th>
                {activeTab === "checkout" && (
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Min. Spend</th>
              )}
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Valid Until</th>
                {activeTab === "product" && (
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Scope</th>
                )}
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Usage</th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={activeTab === "product" ? 8 : 9} className="text-center py-20"> <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase">Loading...</p>
                  </div>
                </td></tr>
              ) : filteredPromos.length === 0 ? (
                <tr><td colSpan={activeTab === "product" ? 8 : 9} className="text-center py-20"><p className="font-bold text-gray-400 uppercase">No promos found.</p>
                </td></tr>
              ) : (
                filteredPromos.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{promo.name}</p>
                      {promo.description && (
                        <p className="text-[10px] text-gray-400 truncate max-w-[200px] mt-0.5">{promo.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-gray-50 text-gray-500 border border-gray-100">
                        {promo.discount_type?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-gray-900 text-sm">{formatDiscount(promo)}</span>
                    </td>
                    {activeTab === "checkout" && (
                    <td className="px-6 py-4 text-center">
                      {promo.min_amount ? (
                        <span className="inline-flex justify-center px-3 py-1 rounded-lg font-black text-xs bg-yellow-50 text-yellow-700 border border-yellow-100">
                          ₱{Number(promo.min_amount).toLocaleString("en-PH")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-bold uppercase">None</span>
                      )}
                    </td>
                  )}
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-gray-500">{formatDate(promo.end_date)}</span>
                    </td>
                    {activeTab === "product" && (
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                          {getScopeLabel(promo)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-gray-900">{promo.usage_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                        promo.status === "active"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-gray-50 text-gray-400 border-gray-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${promo.status === "active" ? "bg-green-500" : "bg-gray-300"}`} />
                        {promo.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {promo.status === "active" && (
                          <button 
                            onClick={() => handleNotify(promo.id)}
                            disabled={notifyingIds.includes(promo.id)}
                            title="Send Email Notification"
                            className="p-2 bg-gray-50 border border-gray-100 hover:bg-blue-50 rounded-xl shadow-sm disabled:opacity-50"
                          >
                            <img src={sendIcon} alt="Notify" className={`h-4 w-4 opacity-70 ${notifyingIds.includes(promo.id) ? 'animate-pulse' : ''}`} />
                          </button>
                        )}
                        <button onClick={() => handleTogglePublish(promo)}
                          className="p-2 bg-gray-50 border border-gray-100 hover:bg-yellow-50 rounded-xl shadow-sm">
                          <img src={promo.status === "active" ? publish : upublish} alt="Status" className="h-4 w-4 opacity-70" />
                        </button>
                        <button onClick={() => handleDelete(promo.id)}
                          className="p-2 bg-gray-50 border border-gray-100 hover:bg-red-50 rounded-xl shadow-sm">
                          <img src={remove} alt="Delete" className="h-4 w-4 opacity-70" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOffers;