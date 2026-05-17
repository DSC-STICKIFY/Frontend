/**
 * getBestPromo — product display_type promos lang ang i-match
 */
export const getBestPromo = (product, promos = []) => {
  if (!product || !Array.isArray(promos) || promos.length === 0) return null;

  const productId    = String(product?.product_id ?? product?.id ?? "");
  const productCat   = (product?.category ?? product?.product_category ?? "").toString().trim();
  const productType  = (product?.type ?? product?.product_type ?? "").toString().trim();
  const productPrice = parseFloat(product?.price ?? product?.product_price ?? 0);

  const matches = promos.filter((promo) => {
    // Checkout vouchers — dili i-show sa product listing
    if (promo.display_type === 'checkout') return false;

    if (promo.min_amount && productPrice < parseFloat(promo.min_amount)) return false;

    if (promo.applicable_to === "all") return true;

    const applicableIds = (promo.applicable_ids || []).map((id) => String(id));

    if (promo.applicable_to === "categories") {
      return applicableIds.some((cat) => cat.toLowerCase() === productCat.toLowerCase());
    }
    if (promo.applicable_to === "types") {
      return applicableIds.some((type) => type.toLowerCase() === productType.toLowerCase());
    }
    if (promo.applicable_to === "products") {
      return applicableIds.includes(productId);
    }

    return false;
  });

  if (matches.length === 0) return null;

  // Calculate actual discount for each and pick the highest
  return matches.sort((a, b) => {
    const getAmt = (p) => {
      if (p.discount_type === "percentage") {
        const rawPct = parseFloat(p.discount_value) || 0;
        const pct = rawPct > 100 ? 1 : rawPct; // ✅ becomes 1% if > 100%
        const d = productPrice * (pct / 100);
        return p.max_discount ? Math.min(d, parseFloat(p.max_discount)) : d;
      }
      if (p.discount_type === "fixed") return parseFloat(p.discount_value);
      return 0; // free_shipping has 0 price impact
    };
    return getAmt(b) - getAmt(a);
  })[0];
};

/**
 * getDiscountedPrice — returns discounted price, null if free_shipping or no promo
 */
/**
 * getDiscountedPrice — returns discounted price, or original price if no discount applies
 */
export const getDiscountedPrice = (price, promo) => {
  // ← removed the bad `const price = parseFloat(originalPrice)` line
  const numPrice = typeof price === "string" 
    ? (parseFloat(price.replace(/[^0-9.]/g, "")) || 0)
    : (parseFloat(price) || 0);

  if (!promo || numPrice === 0) return numPrice; // ← always return the price, never null/0

  if (promo.min_amount && numPrice < parseFloat(promo.min_amount)) return numPrice;

  if (promo.discount_type === "percentage") {
    // ✅ becomes 1% if > 100%
    const rawPct = parseFloat(promo.discount_value) || 0;
    const percentage = rawPct > 100 ? 1 : rawPct;
    let discount = numPrice * (percentage / 100);
    if (promo.max_discount) {
      discount = Math.min(discount, parseFloat(promo.max_discount));
    }
    return Math.max(0, numPrice - discount);
  }

  if (promo.discount_type === "fixed") {
    return Math.max(0, numPrice - parseFloat(promo.discount_value));
  }

  // free_shipping — price itself doesn't change
  return numPrice;
};

/**
 * calculateCheckoutDiscount — for checkout page only
 * Returns the discount AMOUNT (not the final price)
 */
export const calculateCheckoutDiscount = (promo, cartTotal) => {
  if (!promo) return 0;

  const total = parseFloat(cartTotal) || 0;

  if (promo.min_amount && total < parseFloat(promo.min_amount)) return 0;

  if (promo.discount_type === "percentage") {
    let discount = total * (promo.discount_value / 100);
    if (promo.max_discount) {
      discount = Math.min(discount, parseFloat(promo.max_discount));
    }
    return Math.round(discount * 100) / 100;
  }

  if (promo.discount_type === "fixed") {
    return Math.min(parseFloat(promo.discount_value), total);
  }

  if (promo.discount_type === "free_shipping") {
    return 100;
  }

  return 0;
};

/**
 * PromoTag badge — shown on product image
 */
const PromoTag = ({ promo }) => {
  if (!promo) return null;
  if (promo.display_type === 'checkout') return null;

  let label = "";
  if (promo.discount_type === "percentage") {
    label = `${promo.discount_value}% OFF`;
  } else if (promo.discount_type === "fixed") {
    label = `₱${Number(promo.discount_value).toLocaleString("en-PH")} OFF`;
  } else if (promo.discount_type === "free_shipping") {
    label = "FREE SHIPPING";
  }

  return (
    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
      <span className="bg-[#FDE31E] text-black text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
};

export default PromoTag;