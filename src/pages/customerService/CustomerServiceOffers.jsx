import React, { useState } from 'react';
import remove from '../../assets/delete.svg';
import publish from '../../assets/publish.svg';
import upublish from '../../assets/upublish.svg';

// samplee
const initialPromos = [
    {
        id: 1,
        title: "Summer Sale 40%",
        target: "all-users",
        category: "Car",
        message: "Get 10% off on all designs",
        validUntil: "2025-12-01",
        discount: "20%",
        dateCreated: "2025-11-01",
        published: true,
    },
    {
        id: 2,
        title: "Summer Sale 40%",
        target: "all-users",
        category: "Spaceship",
        message: "Get 10% off on all designs",
        validUntil: "2025-11-20",
        discount: "33%",
        dateCreated: "2025-11-02",
        published: true,
    },
    {
        id: 3,
        title: "Summer Sale 40%",
        target: "all-users",
        category: "Spaceship",
        message: "Get 10% off on all designs",
        validUntil: "2025-11-20",
        discount: "33%",
        dateCreated: "2025-11-02",
        published: false,
    },
];

//sample
const initialDiscounts = [
    {
        id: 1,
        code: "LOYALSICHARLIE50",
        amount: "50%",
        validUntil: "2025-12-31",
        published: true,
    },
    {
        id: 2,
        code: "LOYALSICHARLIE50",
        amount: "50%",
        validUntil: "2025-12-31",
        published: true,
    },
    {
        id: 3,
        code: "LOYALSICHARLIE50",
        amount: "50%",
        validUntil: "2025-12-31",
        published: false,
    },
];

const CustomerServiceOffers = () => {
    const [view, setView] = useState("promotions"); // 'promotions' or 'discounts'
    const [promos, setPromos] = useState(initialPromos);
    const [discounts, setDiscounts] = useState(initialDiscounts);

    const togglePublishPromo = (id) => {
        setPromos((prev) =>
            prev.map((p) => (p.id === id ? { ...p, published: !p.published } : p))
        );
    };

    const togglePublishDiscount = (id) => {
        setDiscounts((prev) =>
            prev.map((d) => (d.id === id ? { ...d, published: !d.published } : d))
        );
    };

    return (
        <div className="p-3 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Offers & Promotions</h1>


            <div className="flex gap-10 font-semibold text-sm mb-3">
                <button
                    className={`cursor-pointer font-bold ${view === 'promotions' ? 'text-blue-600' : ''}`}
                    onClick={() => setView("promotions")}
                >
                    Promotions
                </button>
                <button
                    className={`cursor-pointer font-bold ${view === 'discounts' ? 'text-blue-600' : ''}`}
                    onClick={() => setView("discounts")}
                >
                    Discounts
                </button>
            </div>

     
            <div className="border border-[#DCDCDC] rounded-[12px] flex-1 min-w-0 flex flex-col overflow-hidden">
                <div className="rounded-[12px] flex-1 min-w-0 flex flex-col overflow-hidden">
                    <div className="overflow-x-auto">
                        {view === "promotions" && (
                            <table className="table-fixed min-w-full bg-white border-gray-200 rounded-lg">
                                <thead>
                                    <tr className="bg-gray-50 text-2xl text-center text-gray-500">
                                        <th className="py-6 px-4 w-1/3 font-normal text-center">Title</th>
                                        <th className="py-6 px-4 w-1/3 font-normal text-center">Target</th>
                                        <th className="py-6 px-4 w-1/3 font-normal text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {promos.map((promo) => (
                                        <tr key={promo.id} className="text-center">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold">{promo.title}</div>
                                                <div className="text-gray-400 text-sm">{promo.message}</div>
                                            </td>
                                            <td className="py-3 px-4 font-semibold">{promo.target}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-1 rounded-lg text-sm ${
                                                        promo.published
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-[#DDDDDD] text-gray-500"
                                                    }`}
                                                    onClick={() => togglePublishPromo(promo.id)}
                                                >
                                                    {promo.published ? "Active" : "Expired"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {view === "discounts" && (
                            <table className="table-fixed min-w-full bg-white border border-gray-200 rounded-lg">
                                <thead>
                                    <tr className="bg-gray-50 text-2xl text-center text-gray-500">
                                        <th className="py-6 px-4 w-1/4 font-normal text-center">Discount Code</th>
                                        <th className="py-6 px-4 w-1/4 font-normal text-center">Amount</th>
                                        <th className="py-6 px-4 w-1/4 font-normal text-center">Validity</th>
                                        <th className="py-6 px-4 w-1/4 font-normal text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {discounts.map((discount) => (
                                        <tr key={discount.id} className="text-center">
                                            <td className="py-3 px-4 font-semibold">{discount.code}</td>
                                            <td className="py-3 px-4 font-semibold">{discount.amount} off</td>
                                            <td className="py-3 px-4 font-semibold">Expires {discount.validUntil}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-1 rounded-lg text-sm ${
                                                        discount.published
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-[#DDDDDD] text-gray-500"
                                                    }`}
                                                    onClick={() => togglePublishDiscount(discount.id)}
                                                >
                                                    {discount.published ? "Active" : "Expired"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerServiceOffers;
