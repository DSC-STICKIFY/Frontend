import React, { useState, useEffect, useMemo } from 'react';

const CATEGORIES = [
  "Stickers",
  "Decals & Wrap",
  "Signage",
  "Giveaways",
  "Printing",
  "Graphic Services",
];

const TYPES_BY_CATEGORY = {
  Stickers: [
    "Hologram",
    "Glossy",
    "Matte",
    "Transparent",
    "Glitter",
    "Scratch",
    "Cut out",
    "Visor",
  ],
  "Decals & Wrap": [
    "Car Wrap",
    "Motorbike Decal",
    "Full Wrap",
    "Partial Wrap",
    "Window Decal",
  ],
  Signage: [
    "Acrylic Signage",
    "Neon Lights Signage",
    "Panaflex Signage",
  ],
  Giveaways: [
    "Keychain",
    "ID Lace",
    "T-Shirt",
    "Calling Cards",
    "Caps",
    "Mugs",
    "Tarpulin",
    "Sintra Board",
  ],
  Printing: [
    "Flyers",
    "Brochures",
    "Business Cards",
    "Posters",
    "Banners",
  ],
  "Graphic Services": [
    "Business Logo",
    "Moto Vlog Logo",
  ],
};

const AddSalesInvoice = ({ onClose, onAddInvoice }) => {
  const today    = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    category:     CATEGORIES[0],
    productType:  TYPES_BY_CATEGORY[CATEGORIES[0]][0],
    price:        '',
    size:         '',
    quantity:     '',
    discount:     '',
    subtotal:     '',
    shippingFee:  '',
    totalAmount:  '',
    date:         today,
    dueDate:      nextWeek,
    invoiceNo:    `ORD-${String(Date.now()).slice(-5)}`,
    customerName: '',
    address:      '',
    tin:          '',
    businessName: '',
  });

  const placeholders = {
    price:        '600.00',
    size:         'Medium',
    quantity:     '5',
    discount:     '0',
    subtotal:     '3000.00',
    shippingFee:  '50.00',
    totalAmount:  '3050.00',
    customerName: 'John Doe',
    address:      '123 Main St, Manila',
    tin:          '123-456-789',
    businessName: 'ABC Corp',
  };

  useEffect(() => {
    const price    = parseFloat(formData.price)       || 0;
    const qty      = parseFloat(formData.quantity)    || 0;
    const discount = parseFloat(formData.discount)    || 0;
    const shipping = parseFloat(formData.shippingFee) || 0;

    const subtotal    = price * qty;
    const totalAmount = subtotal - discount + shipping;

    setFormData(prev => ({
      ...prev,
      subtotal:    subtotal    > 0 ? subtotal.toFixed(2)    : '',
      totalAmount: totalAmount > 0 ? totalAmount.toFixed(2) : '',
    }));
  }, [formData.price, formData.quantity, formData.discount, formData.shippingFee]);

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    const typesForCategory = TYPES_BY_CATEGORY[newCategory] || [];
    const newProductType = typesForCategory.length > 0 ? typesForCategory[0] : '';
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      productType: newProductType,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.productType || !formData.customerName) {
      alert('Product Type and Customer Name are required.');
      return;
    }
    const invoiceData = {
      ...formData,
      product: formData.productType,
    };
    if (onAddInvoice) onAddInvoice(invoiceData);
    onClose();
  };

  // ── Single set of style constants ──
  const inputClass = "border pl-3 h-10 border-[#DCDCDC] rounded-xl w-60 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50/50 transition-all";
  const labelClass = "w-40 text-end font-bold text-[12px] text-gray-500 uppercase tracking-wider";

  const renderField = (field, type = 'text') => (
    <div key={field} className="flex gap-3 items-center">
      <p className={labelClass}>
        {field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
      </p>
      <input
        type={type}
        name={field}
        value={formData[field]}
        onChange={handleChange}
        placeholder={placeholders[field] || ''}
        readOnly={field === 'subtotal' || field === 'totalAmount'}
        className={`${inputClass} ${(field === 'subtotal' || field === 'totalAmount') ? 'bg-gray-50 text-gray-500' : ''}`}
      />
    </div>
  );

  const availableProductTypes = useMemo(() => {
    return TYPES_BY_CATEGORY[formData.category] || [];
  }, [formData.category]);

  return (
    <form className="flex flex-col h-full overflow-y-auto" onSubmit={handleSubmit}>

      {/* Header & Action buttons */}
      <div className="flex justify-between items-center py-4 sticky top-0 bg-white z-10 border-b border-[#DCDCDC] mb-8">
        <h2 className="text-xl font-black text-gray-900">Create New Order Summary</h2>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-8 py-2.5 bg-[#FDE31E] hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition shadow-sm active:scale-95"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex gap-8 flex-wrap">

        {/* Left Column — product details */}
        <div className="flex flex-col gap-4">

          {/* Category dropdown */}
          <div className="flex gap-3 items-center">
            <p className={labelClass}>Category</p>
            <select
              name="category"
              value={formData.category}
              onChange={handleCategoryChange}
              className={inputClass}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Product Type dropdown */}
          <div className="flex gap-3 items-center">
            <p className={labelClass}>Product Type</p>
            <select
              name="productType"
              value={formData.productType}
              onChange={handleChange}
              className={inputClass}
            >
              {availableProductTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {renderField('price')}
          {renderField('size')}
          {renderField('quantity')}
          {renderField('discount')}
          {renderField('subtotal')}
          {renderField('shippingFee')}
          {renderField('totalAmount')}
          {renderField('date', 'date')}
          {renderField('dueDate', 'date')}
        </div>

        {/* Right Column — customer details */}
        <div className="flex flex-col gap-4">
          {renderField('invoiceNo')}
          {renderField('customerName')}
          {renderField('address')}
          {renderField('tin')}
          {renderField('businessName')}
        </div>

      </div>
    </form>
  );
};

export default AddSalesInvoice;