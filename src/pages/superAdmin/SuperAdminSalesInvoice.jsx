import React, { useState, useEffect } from 'react';
import add from '../../assets/add.svg';
import dscLogo from '../../assets/dsclogo.png';
import AddSalesInvoice from '../../components/AddSalesInvoice.jsx';
import { fetchAllOrders } from '../../services/OrdersAPI';
import { getImageUrl } from '../../services/api';
import { getLogoBase64, handleBrowserPrint } from '../../services/PrintingService.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getDueDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatInvoiceNo = (orderId) => `INV-${String(orderId).padStart(5, '0')}`;

const peso = (v) => '₱' + Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────────────────────
// Product image with fallback
// ─────────────────────────────────────────────────────────────────────────────
const ProductImg = ({ src, alt }) => {
    const [errored, setErrored] = useState(false);
    const safeUrl = getImageUrl(src);
    if (!safeUrl || errored) {
        return (
            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" />
                </svg>
            </div>
        );
    }
    return <img src={safeUrl} alt={alt} className="w-8 h-8 rounded object-cover flex-shrink-0" onError={() => setErrored(true)} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Build receipt HTML — for ONE transaction (one order, all its items listed)
// ─────────────────────────────────────────────────────────────────────────────
const buildReceiptHTML = (transaction, logoBase64) => {
    const css = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page { size: 80mm auto; margin: 4mm 3mm; }
        body { background: #f0f0f0; font-family: 'Courier New', Courier, monospace; display: flex; flex-direction: column; align-items: center; padding: 10px 0; }
        .receipt-page { width: 74mm; background: white; padding: 6mm 5mm; font-size: 9.5px; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
        .header { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
        .logo { width: 34px; height: 34px; object-fit: contain; }
        .shop-name { font-size: 12px; font-weight: 700; font-family: Arial, sans-serif; }
        .shop-sub { font-size: 8px; color: #666; margin-top: 1px; }
        .thick { border-top: 1.5px solid #111; margin: 5px 0; }
        .dash  { border: none; border-top: 1px dashed #bbb; margin: 4px 0; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .meta-right { text-align: right; }
        .lbl { font-size: 7px; color: #888; letter-spacing: 0.6px; text-transform: uppercase; }
        .val { font-size: 9.5px; margin-top: 1px; }
        .val-bold { font-size: 9.5px; font-weight: 700; margin-top: 1px; }
        .bill-name { font-weight: 700; font-size: 9.5px; margin: 1px 0; }
        .bill-sub  { font-size: 8.5px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        thead th { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.4px; color: #888; padding: 2px 0; border-bottom: 1px dashed #ccc; }
        tbody td { padding: 3px 0; font-size: 9px; vertical-align: top; }
        .item-name { font-weight: 600; font-size: 9px; }
        .item-meta  { font-size: 7.5px; color: #999; }
        .total-row { display: flex; justify-content: space-between; font-size: 9.5px; padding: 1.5px 0; color: #555; }
        .grand-total { font-weight: 700; font-size: 11px; color: #111; border-top: 1px solid #111; padding-top: 3px; margin-top: 2px; }
        .footer { text-align: center; font-size: 8.5px; color: #777; margin-top: 5px; }
        .footer-sub { font-size: 7.5px; color: #bbb; margin-top: 1px; }
        @media print { body { background: white; padding: 0; } .receipt-page { box-shadow: none; } }
    `;

    const fD = (ds) => { if (!ds) return '—'; const d = new Date(ds); return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); };
    const dD = (ds) => { if (!ds) return '—'; const d = new Date(ds); if (isNaN(d)) return '—'; d.setDate(d.getDate() + 7); return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); };
    const p  = (v)  => '&#8369;' + Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 });

    const rows = transaction.items.map(item => `
        <tr>
            <td>
                <div class="item-name">${item.product_name}</div>
                ${item.size ? `<div class="item-meta">Size: ${item.size}</div>` : ''}
            </td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right;font-weight:600">${p(item.subtotal)}</td>
        </tr>
    `).join('');

    const page = `
        <div class="receipt-page">
            <div class="header">
                <img class="logo" src="${logoBase64}" alt="DSC" />
                <div>
                    <div class="shop-name">Stickify DSC</div>
                    <div class="shop-sub">Davao City, Philippines</div>
                    <div class="shop-sub">contact@stickifydsc.com</div>
                </div>
            </div>
            <div class="thick"></div>
            <div class="meta-row">
                <div>
                    <div class="lbl">Invoice</div>
                    <div class="val-bold">${transaction.invoiceNo}</div>
                </div>
                <div class="meta-right">
                    <div class="lbl">Date</div>
                    <div class="val">${fD(transaction.date)}</div>
                    <div class="lbl" style="margin-top:4px">Due Date</div>
                    <div class="val">${dD(transaction.date)}</div>
                </div>
            </div>
            <div class="dash"></div>
            <div class="lbl">Bill To</div>
            <div class="bill-name">${transaction.name}</div>
            <div class="bill-sub">${transaction.address}</div>
            ${transaction.contact && transaction.contact !== '—' ? `<div class="bill-sub">${transaction.contact}</div>` : ''}
            <div class="dash"></div>
            <table>
                <thead>
                    <tr>
                        <th style="text-align:left">Item</th>
                        <th style="text-align:center">Qty</th>
                        <th style="text-align:right">Amount</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="dash"></div>
            <div class="total-row"><span>Items</span><span>${transaction.items.length} item(s)</span></div>
            <div class="total-row"><span>Payment</span><span>${transaction.paymentMethod}</span></div>
            <div class="total-row grand-total"><span>TOTAL</span><span>${p(transaction.totalPrice)}</span></div>
            <div class="thick"></div>
            <div class="footer">
                Thank you for your order!
                <div class="footer-sub">This is a computer-generated receipt.</div>
            </div>
        </div>
    `;

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Receipt — ${transaction.invoiceNo}</title>
    <style>${css}</style>
</head>
<body>${page}</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Print icon
// ─────────────────────────────────────────────────────────────────────────────
const PrintIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const SuperAdminSalesInvoice = () => {
    const [transactions,      setTransactions]      = useState([]);
    const [loading,           setLoading]           = useState(true);
    const [searchTerm,        setSearchTerm]        = useState('');
    const [showInvoice,       setShowInvoice]       = useState(false);
    const [dynamicProducts,   setDynamicProducts]   = useState([]);
    const [dynamicCategories, setDynamicCategories] = useState([]);
    const [editingId,         setEditingId]         = useState(null);
    const [editDraft,         setEditDraft]         = useState({});
    const [logoBase64,        setLogoBase64]        = useState('');
    const [printingId,        setPrintingId]        = useState(null);
    const [expandedIds,       setExpandedIds]       = useState(new Set());

    // ── Fetch completed orders → 1 transaction per order ────────────────────
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const orders = await fetchAllOrders();
                const completed = orders.filter(o => o.status === 'Completed');

                const mapped = completed.map(order => {
                    const details = order.order_details || order.items || [];

                    const items = details.length === 0
                        ? [{
                            product_name:  order.product_name || 'Product',
                            size:          order.size || null,
                            quantity:      order.quantity || 1,
                            subtotal:      Number(order.total_price || 0),
                            product_image: order.product_image || null,
                            category:      order.product_category || '—',
                        }]
                        : details.map(item => {
                            const p   = item.product || {};
                            const qty = Number(item.quantity || 1);
                            const up  = Number(item.item_price || item.price || p.product_price || 0);
                            return {
                                product_name:  p.product_name || item.product_name || 'Product',
                                size:          item.size || null,
                                quantity:      qty,
                                subtotal:      Number(item.subtotal || up * qty),
                                product_image: p.product_image || item.product_image || null,
                                category:      p.product_category || item.category || '—',
                            };
                        });

                    return {
                        id:            order.order_id,
                        invoiceNo:     formatInvoiceNo(order.order_id),
                        name:          order.name || 'Customer',
                        address:       order.address || '—',
                        contact:       order.contact_number || '—',
                        date:          order.order_date,
                        totalPrice:    Number(order.total_price || 0),
                        paymentMethod: order.payment_method || 'COD',
                        itemCount:     items.length,
                        items,
                        _firstProduct:  items[0]?.product_name || 'Product',
                        _firstImg:      items[0]?.product_image || null,
                        _firstCategory: items[0]?.category || '—',
                    };
                });

                mapped.sort((a, b) => new Date(b.date) - new Date(a.date));

                setTransactions(mapped);
                setDynamicProducts([...new Set(mapped.flatMap(t => t.items.map(i => i.product_name)).filter(Boolean))]);
                setDynamicCategories([...new Set(mapped.flatMap(t => t.items.map(i => i.category)).filter(c => c && c !== '—'))]);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // ── Load logo as base64 ───────────────────────────────────────────────────
    useEffect(() => {
        fetch(dscLogo)
            .then(r => r.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => setLogoBase64(reader.result);
                reader.readAsDataURL(blob);
            })
            .catch(() => setLogoBase64(''));
    }, []);

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = React.useMemo(() => {
        if (!searchTerm) return transactions;
        const t = searchTerm.toLowerCase();
        return transactions.filter(tx =>
            tx.invoiceNo.toLowerCase().includes(t) ||
            tx.name.toLowerCase().includes(t) ||
            tx.address.toLowerCase().includes(t) ||
            tx.items.some(i => i.product_name.toLowerCase().includes(t) || i.category.toLowerCase().includes(t))
        );
    }, [transactions, searchTerm]);

    // ── Edit handlers ─────────────────────────────────────────────────────────
    const handleAddInvoice = (newInvoice) => {
        const nextId = Date.now();
        const item = {
            product_name:  newInvoice.product || 'Product',
            size:          null,
            quantity:      newInvoice.quantity || 1,
            subtotal:      parseFloat(newInvoice.totalAmount || newInvoice.price || 0),
            product_image: null,
            category:      newInvoice.category || '—',
        };
        setTransactions(prev => [{
            id:            nextId,
            invoiceNo:     formatInvoiceNo(nextId),
            name:          newInvoice.customerName || 'N/A',
            address:       newInvoice.address || '—',
            contact:       newInvoice.contact || '—',
            date:          new Date().toISOString(),
            totalPrice:    item.subtotal,
            paymentMethod: newInvoice.paymentMethod || 'COD',
            itemCount:     1,
            items:         [item],
            _firstProduct:  item.product_name,
            _firstImg:      null,
            _firstCategory: item.category,
        }, ...prev]);
        setShowInvoice(false);
    };

    const startEdit  = (tx) => { setEditingId(tx.id); setEditDraft({ ...tx }); };
    const cancelEdit = ()   => { setEditingId(null); setEditDraft({}); };
    const saveEdit   = ()   => {
        setTransactions(prev => prev.map(tx => tx.id === editingId ? { ...tx, ...editDraft } : tx));
        setEditingId(null);
        setEditDraft({});
    };
    const handleDraftChange = (field, value) => setEditDraft(prev => ({ ...prev, [field]: value }));

    // ── Print ─────────────────────────────────────────────────────────────────
    const handlePrint = (tx) => {
        setPrintingId(tx.id);
        const html = buildReceiptHTML(tx, logoBase64);
        const blob = new Blob([html], { type: 'text/html' });
        const url  = URL.createObjectURL(blob);
        const pw = 460, ph = 720;
        const left = Math.round((window.screen.width  - pw) / 2);
        const top  = Math.round((window.screen.height - ph) / 2);
        const popup = window.open(url, '_blank', `width=${pw},height=${ph},left=${left},top=${top},scrollbars=yes`);
        if (!popup) {
            alert('Pop-up blocked. Please allow pop-ups and try again.');
            URL.revokeObjectURL(url);
        } else {
            popup.addEventListener('load', () => { URL.revokeObjectURL(url); popup.focus(); popup.print(); });
        }
        setTimeout(() => setPrintingId(null), 1500);
    };

    // ── Expand toggle ─────────────────────────────────────────────────────────
    const toggleExpand = (id) => setExpandedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    return (
        <>
            <div className="p-3 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Sales Invoices</h1>

                {showInvoice ? (
                    <AddSalesInvoice
                        onClose={() => setShowInvoice(false)}
                        onAddInvoice={handleAddInvoice}
                        productOptions={dynamicProducts}
                        categoryOptions={dynamicCategories}
                    />
                ) : (
                    <>
                        {/* ── Toolbar ── */}
                        <div className="flex justify-between items-center mb-3 gap-3 flex-wrap">
                            <input
                                type="text"
                                placeholder="Search by invoice, product, customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border border-[#DCDCDC] rounded px-2 py-1 w-72 text-sm"
                            />
                            <button
                                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#FDE31E] hover:bg-yellow-400 text-gray-900 font-bold transition shadow-sm active:scale-95"
                                onClick={() => setShowInvoice(true)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="text-sm">Create Invoice</span>
                            </button>
                        </div>

                        {/* ── Table Container ── */}
                        <div className="flex flex-col w-full overflow-hidden flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm mt-2">
                            {/* Header bar */}
                            <div className="border-b border-[#DCDCDC] px-4 py-2.5 flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-500">
                                    {loading ? 'Loading...' : `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`}
                                </p>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-green-50 text-green-700 border border-green-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Completed
                                </div>
                            </div>

                            <div className="p-0 overflow-x-auto flex-1 custom-scrollbar">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <div className="w-8 h-8 border-2 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
                                        <p className="text-xs font-bold text-gray-400 uppercase">Loading invoices...</p>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                        <p className="font-bold uppercase">{searchTerm ? 'No results found.' : 'No completed orders yet.'}</p>
                                    </div>
                                ) : (
                                    <table className="w-full table-auto border-collapse text-sm">
                                        <thead className="bg-white sticky top-0 z-10">
                                            {/* ── Item(s) and Qty columns removed ── */}
                                            <tr className="text-left border-b border-gray-300">
                                                <th className="px-3 py-2 font-semibold w-6"></th>
                                                <th className="px-3 py-2 font-semibold">Invoice</th>
                                                <th className="px-3 py-2 font-semibold">Customer</th>
                                                <th className="px-3 py-2 font-semibold">Date</th>
                                                <th className="px-3 py-2 font-semibold">Due</th>
                                                <th className="px-3 py-2 font-semibold">Payment</th>
                                                <th className="px-3 py-2 font-semibold text-right">Total</th>
                                                <th className="px-3 py-2 font-semibold text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map(tx => {
                                                const isEditing  = editingId === tx.id;
                                                const isPrinting = printingId === tx.id;
                                                const isExpanded = expandedIds.has(tx.id);
                                                const multiItem  = tx.items.length > 1;

                                                return (
                                                    <React.Fragment key={tx.id}>
                                                        {/* ── Transaction row ── */}
                                                        <tr
                                                            className={`border-b border-gray-100 transition ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'} ${multiItem ? 'cursor-pointer' : ''}`}
                                                            onClick={() => multiItem && toggleExpand(tx.id)}
                                                        >
                                                            {/* Expand chevron */}
                                                            <td className="px-3 py-3 text-gray-400 text-xs">
                                                                {multiItem && (
                                                                    <span className={`inline-block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                                )}
                                                            </td>

                                                            {/* Invoice # */}
                                                            <td className="px-3 py-3 font-mono">
                                                                <span className="text-xs font-semibold text-gray-700">{tx.invoiceNo}</span>
                                                            </td>

                                                            {/* Customer */}
                                                            <td className="px-3 py-3">
                                                                <p className="font-semibold text-gray-900 text-sm leading-tight">{tx.name}</p>
                                                                {tx.contact && tx.contact !== '—' && (
                                                                    <p className="text-xs text-gray-400">{tx.contact}</p>
                                                                )}
                                                            </td>

                                                            {/* Date */}
                                                            <td className="px-3 py-3 text-gray-500 text-sm whitespace-nowrap">
                                                                {formatDate(tx.date)}
                                                            </td>

                                                            {/* Due date */}
                                                            <td className="px-3 py-3 text-gray-500 text-sm whitespace-nowrap">
                                                                {getDueDate(tx.date)}
                                                            </td>

                                                            {/* Payment */}
                                                            <td className="px-3 py-3 text-gray-500 text-sm">
                                                                {tx.paymentMethod}
                                                            </td>

                                                            {/* Total */}
                                                            <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                                {isEditing ? (
                                                                    <input
                                                                        type="number"
                                                                        value={editDraft.totalPrice ?? ''}
                                                                        onChange={e => handleDraftChange('totalPrice', e.target.value)}
                                                                        className="border border-gray-300 rounded px-1.5 py-0.5 text-sm w-24 text-right focus:outline-none focus:border-yellow-400 bg-white"
                                                                    />
                                                                ) : (
                                                                    <span className="inline-block bg-[#FFE100] text-black text-sm font-black px-2.5 py-0.5 rounded-lg">
                                                                        {peso(tx.totalPrice)}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                                {isEditing ? (
                                                                    <div className="flex gap-1.5 justify-center">
                                                                        <button onClick={saveEdit} className="text-xs font-semibold text-white bg-green-500 hover:bg-green-600 px-2.5 py-1 rounded-lg transition">Save</button>
                                                                        <button onClick={cancelEdit} className="text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition">Cancel</button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button
                                                                            onClick={() => startEdit(tx)}
                                                                            className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handlePrint(tx)}
                                                                            disabled={isPrinting}
                                                                            className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-2.5 py-1 rounded-lg transition"
                                                                            title={`Print receipt for ${tx.invoiceNo}`}
                                                                        >
                                                                            {isPrinting ? (
                                                                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                                                </svg>
                                                                            ) : <PrintIcon />}
                                                                            Print
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>

                                                        {/* ── Expanded sub-rows for multi-item orders ── */}
                                                        {isExpanded && tx.items.map((item, idx) => (
                                                            <tr
                                                                key={`${tx.id}-item-${idx}`}
                                                                className="border-b border-dashed border-gray-100 bg-gray-50/60 text-sm"
                                                            >
                                                                <td className="pl-6 py-2 text-gray-200 text-xs">
                                                                    {idx === tx.items.length - 1 ? '└' : '├'}
                                                                </td>
                                                                {/* Invoice col — empty */}
                                                                <td className="px-3 py-2" />
                                                                {/* Customer col — product info (spans into Date col) */}
                                                                <td className="px-3 py-2" colSpan={2}>
                                                                    <div className="flex items-center gap-2">
                                                                        <ProductImg src={item.product_image} alt={item.product_name} />
                                                                        <div>
                                                                            <p className="font-medium text-gray-700 truncate max-w-[180px]">{item.product_name}</p>
                                                                            {item.size && <p className="text-[10px] text-gray-400">Size: {item.size}</p>}
                                                                            <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                {/* Due / Payment cols — empty */}
                                                                <td className="px-3 py-2" colSpan={2} />
                                                                {/* Subtotal */}
                                                                <td className="px-3 py-2 text-right text-gray-600 font-semibold">
                                                                    {peso(item.subtotal)}
                                                                </td>
                                                                <td />
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default SuperAdminSalesInvoice;