import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ReturnPoliciesManager = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Product data for dropdowns (Assuming they are available or we can fetch them)
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [types, setTypes] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        allowed_value: '',
        allowed_unit: 'days',
        scope_type: 'all',
        category_name: '',
        type_name: '',
        product_id: '',
        is_returnable: true,
    });
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchPolicies();
        fetchProductsData();
    }, []);

    const fetchPolicies = async () => {
        try {
            const res = await api.get('/return-policies');
            setPolicies(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsData = async () => {
        try {
            const res = await api.get('/all_products');
            const prods = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setProducts(prods);
            
            // Extract unique categories and types
            const cats = [...new Set(prods.map(p => p.product_category).filter(Boolean))];
            const typs = [...new Set(prods.map(p => p.product_type).filter(Boolean))];
            
            setCategories(cats);
            setTypes(typs);
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!formData.name || formData.allowed_value === '') {
            setError("Name and Allowed Value are required.");
            return;
        }

        setSaving(true);
        try {
            await api.post('/return-policies', {
                ...formData,
                allowed_value: parseInt(formData.allowed_value, 10),
                product_id: formData.product_id ? parseInt(formData.product_id, 10) : null
            });
            setSuccess("Policy created successfully.");
            setFormData({
                name: '',
                allowed_value: '',
                allowed_unit: 'days',
                scope_type: 'all',
                category_name: '',
                type_name: '',
                product_id: '',
                is_returnable: true,
            });
            fetchPolicies();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save policy.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this policy?")) return;
        try {
            await api.delete(`/return-policies/${id}`);
            fetchPolicies();
        } catch (err) {
            alert("Failed to delete policy");
        }
    };

    const FieldLabel = ({ children }) => (
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 px-1">
            {children}
        </label>
    );

    return (
        <div className="bg-white border border-[#DCDCDC] rounded-[32px] p-8 mb-6 shadow-sm">
            <div className="mb-5">
                <h2 className="text-base font-bold text-gray-900">Return Eligibility Policies</h2>
                <p className="text-xs text-gray-400 mt-0.5">Control which products are eligible for return and their allowed time frame after delivery.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-2xl border border-[#DCDCDC]">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Add New Policy</h3>
                
                {error && <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                {success && <div className="mb-4 text-xs text-green-600 bg-green-50 p-2 rounded">{success}</div>}
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <FieldLabel>Policy Name</FieldLabel>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. 7 Days Standard" className="w-full px-4 py-2 text-sm border rounded-xl" required />
                    </div>
                    <div>
                        <FieldLabel>Scope Type (Priority: Product &gt; Type &gt; Category &gt; Global)</FieldLabel>
                        <select name="scope_type" value={formData.scope_type} onChange={handleChange} className="w-full px-4 py-2 text-sm border rounded-xl">
                            <option value="all">Global (All)</option>
                            <option value="category">Category</option>
                            <option value="type">Type</option>
                            <option value="product">Specific Product</option>
                        </select>
                    </div>
                </div>

                {formData.scope_type === 'category' && (
                    <div className="mb-4">
                        <FieldLabel>Category</FieldLabel>
                        <select name="category_name" value={formData.category_name} onChange={handleChange} className="w-full px-4 py-2 text-sm border rounded-xl" required>
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}

                {formData.scope_type === 'type' && (
                    <div className="mb-4">
                        <FieldLabel>Type</FieldLabel>
                        <select name="type_name" value={formData.type_name} onChange={handleChange} className="w-full px-4 py-2 text-sm border rounded-xl" required>
                            <option value="">Select Type</option>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                )}

                {formData.scope_type === 'product' && (
                    <div className="mb-4">
                        <FieldLabel>Product</FieldLabel>
                        <select name="product_id" value={formData.product_id} onChange={handleChange} className="w-full px-4 py-2 text-sm border rounded-xl" required>
                            <option value="">Select Product</option>
                            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <FieldLabel>Is Returnable?</FieldLabel>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="is_returnable" checked={formData.is_returnable} onChange={handleChange} className="w-4 h-4 rounded text-[#FDE31E] focus:ring-[#FDE31E]" />
                            {formData.is_returnable ? "Yes, allow returns" : "No, do not allow returns"}
                        </label>
                    </div>
                    {formData.is_returnable && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <FieldLabel>Allowed Value</FieldLabel>
                                <input type="number" min="0" name="allowed_value" value={formData.allowed_value} onChange={handleChange} className="w-full px-4 py-2 text-sm border rounded-xl" />
                            </div>
                            <div>
                                <FieldLabel>Unit</FieldLabel>
                                <select name="allowed_unit" value={formData.allowed_unit} onChange={handleChange} className="w-full px-4 py-2 text-sm border rounded-xl">
                                    <option value="minutes">Minutes (Testing)</option>
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-4">
                    <button type="submit" disabled={saving} className="px-6 py-2 bg-[#FDE31E] hover:bg-yellow-400 text-black font-black text-xs uppercase rounded-xl transition-all shadow-sm disabled:opacity-50">
                        {saving ? "Saving..." : "Add Policy"}
                    </button>
                </div>
            </form>

            {/* List */}
            <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4">Active Policies</h3>
                {loading ? (
                    <p className="text-sm text-gray-500">Loading policies...</p>
                ) : policies.length === 0 ? (
                    <p className="text-sm text-gray-500">No policies created yet.</p>
                ) : (
                    <div className="overflow-x-auto border border-[#DCDCDC] rounded-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-[#DCDCDC] text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Scope</th>
                                    <th className="px-4 py-3">Target</th>
                                    <th className="px-4 py-3">Eligibility</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCDCDC]">
                                {policies.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg ${
                                                p.scope_type === 'product' ? 'bg-purple-100 text-purple-700' :
                                                p.scope_type === 'type' ? 'bg-blue-100 text-blue-700' :
                                                p.scope_type === 'category' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {p.scope_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {p.scope_type === 'product' ? p.product?.product_name :
                                             p.scope_type === 'type' ? p.type_name :
                                             p.scope_type === 'category' ? p.category_name : 'All Products'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.is_returnable ? (
                                                <span className="text-green-600 font-medium">Returnable within {p.allowed_value} {p.allowed_unit}</span>
                                            ) : (
                                                <span className="text-red-500 font-medium">Not Returnable</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReturnPoliciesManager;
