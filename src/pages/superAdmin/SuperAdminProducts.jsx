import React, { useState, useEffect, useMemo } from "react";
import addIcon from "../../assets/add.svg";
import {
  fetchAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../../services/ProductsService";
import { getImageUrl, toArray, PLACEHOLDER_IMAGE } from "../../services/api";
import ProductVariationsModal from "./ProductVariationsModal";


const columnOrder = [
  "product_name",
  "product_price",
  "product_description",
  "product_quantity",
  "shelf_location",
  "product_image",
];

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
    "Assorted",
  ],
  "Decals & Wrap": [
    "Car Service Layout",
    "Motor Service Layout",
  ],
  Signage: ["Acrylic Signage", "Neon Lights Signage", "Panaflex Signage"],
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
  Printing: ["Flyers", "Brochures", "Business Cards", "Posters", "Banners"],
  "Graphic Services": ["Business Logo", "Moto Vlog Logo"],
};

const SIGNAGE_SUBTYPES = {
  "Acrylic Signage": [
    {
      name: "LOGO FLAT BUILDUP (Single Face)",
      description: "8,000 minimum purchase per order",
    },
    {
      name: "LOGO FLAT BUILDUP (Double Face)",
      description: "8,000 minimum purchase per order",
    },
    {
      name: "BUILD UP LETTERS (Lighted)", description: "8,000 minimum purchase per order",
    },
    {
      name: "BUILD UP LETTERS (Non Lighted)",
      price: 1800,
      description: "8,000 minimum purchase per order",
    },
  ],
  "Neon Lights Signage": [
    {
      name: "1 color", description: "6,000 minimum purchase order",
    },
    {
      name: "2 colors", description: "6,000 minimum purchase order",
    },
    {
      name: "3 colors", description: "6,000 minimum purchase order",
    },
    {
      name: "4 colors", description: "6,000 minimum purchase order",
    },
  ],
  "Panaflex Signage": [
    {
      name: "CHANGE PANAFLEX only", description: "4,000 minimum purchase order",
    },
    {
      name: "PRINT PANAFLEX only", description: "800 minimum purchase order",
    },
    {
      name: "SINGLE FACE PANAFLEX (with Lights)", description: "8,000 minimum purchase order",
    },
    {
      name: "DOUBLE FACE PANAFLEX (with Lights)", description: "8,000 minimum purchase order",
    },
  ],
};

const GRAPHIC_SERVICE_TIERS = {
  "Business Logo": [
    { name: "Starter", price: 800 },
    { name: "Basic", price: 1000 },
    { name: "Standard", price: 2000 },
    { name: "Premium", price: 2500 },
  ],
  "Moto Vlog Logo": [
    { name: "Starter", price: 1000 },
    { name: "Basic", price: 1500 },
    { name: "Standard", price: 1800 },
    { name: "Premium", price: 2500 },
  ],
};

const GIVEAWAY_OPTIONS = {
  "T-Shirt": [
    "Sublimation Print Drifit Shirt - White",
    "DTF Print Cotton Shirt - White/Colored",
  ],
  "Calling Cards": ["Front print", "Front/Back Print"],
  Mugs: ["White Mug", "Magic Mug"],
  "Sintra Board": ["Standee", "Calling Cards"],
};



const normalizeProduct = (
  product,
  fallbackCategory = "Default",
  fallbackType = "Uncategorized",
) => {
  if (!product) return null;

  return {
    ...product,
    product_category:
      product.product_category || product.category || fallbackCategory,
    product_type: product.product_type || product.type || fallbackType,
    product_name: product.product_name || "",
    product_price: parseFloat(product.product_price || 0),
    product_description: product.product_description || product.description || "",
    is_customizable: product.is_customizable !== undefined ? product.is_customizable : true,
    product_quantity: product.product_quantity !== undefined ? parseInt(product.product_quantity) : 0,
    shelf_location: product.shelf_location || "",
    product_image: getImageUrl(product.product_image),
    price_map_image: getImageUrl(product.price_map_image),
    wrap_price: product.wrap_price || null,
    glossy_price: product.glossy_price || null,
    hologram_price: product.hologram_price || null,
    is_car_service: !!product.is_car_service,
    is_motor_service: !!product.is_motor_service,
  };
};

const validateImage = (file) => {
  if (!file) return { valid: false, message: "Please upload a product image." };
  if (!(file instanceof File))
    return { valid: false, message: "Invalid image file." };
  if (!file.type?.startsWith("image/"))
    return {
      valid: false,
      message: "Please upload a valid image (jpg, jpeg, png, webp).",
    };
  return { valid: true };
};

/* ===================================
   SHARED COMPONENTS
   =================================== */

const Toast = ({ type = "success", message, onClose }) => {
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (!message) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timerRef.current);
  }, [message, onClose]);

  if (!message) return null;

  const colorMap = {
    error: { wrap: "bg-red-50 border-red-200 text-red-700", bar: "bg-red-400" },
    deleted: { wrap: "bg-orange-50 border-orange-200 text-orange-700", bar: "bg-orange-400" },
    updated: { wrap: "bg-blue-50 border-blue-200 text-blue-700", bar: "bg-blue-400" },
    success: { wrap: "bg-green-50 border-green-200 text-green-700", bar: "bg-green-400" },
  };
  const colors = colorMap[type] ?? colorMap.success;

  return (
    <div className={`mb-4 border rounded-xl overflow-hidden shadow-sm ${colors.wrap}`}>
      <div className="px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-semibold">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
      {/* Progress bar drains over 3s */}
      <div className="h-0.5 w-full bg-black/5">
        <div
          key={message}
          className={`h-full ${colors.bar} opacity-60`}
          style={{ animation: "toast-drain 3s linear forwards" }}
        />
      </div>
      <style>{`
        @keyframes toast-drain {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

/* ===================================
   MAIN COMPONENT
   =================================== */

const SuperAdminProducts = () => {
  const [productsData, setProductsData] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Stickers");
  const [selectedType, setSelectedType] = useState("Hologram");
  const [newProductImage, setNewProductImage] = useState(null);
  const [activeVariationsProduct, setActiveVariationsProduct] = useState(null);
  const [formValues, setFormValues] = useState({
    product_name: "",
    product_price: "",
    product_description: "",
    is_customizable: true,
    product_quantity: "0",
    shelf_location: "",
  });
  const [editingProduct, setEditingProduct] = useState({});
  const [toast, setToast] = useState({ type: "success", message: "" });
  const [confirmDelete, setConfirmDelete] = useState(null); // product_id pending delete
  const [multiPriceMode, setMultiPriceMode] = useState(false);
  const [multiPrices, setMultiPrices] = useState({
    wrap: "",
    glossy: "",
    hologram: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carPriceMode, setCarPriceMode] = useState(false);
  const [carPartsPrices, setCarPartsPrices] = useState({
    "Roof": "",
    "Hood": "",
    "Bumper Front": "",
    "Bumper Back": "",
    "Trunk": "",
    "Mirror": "",
    "Side Body": "",
    "Door Handle": "",
    "Tail Light": "",
    "Head Light": "",
    "Fog Light": "",
    "Grill": "",
    "Rails": "",
    "Guard": "",
    "De-chrome Full": ""
  });
  const [isCarService, setIsCarService] = useState(false);
  const [isMotorService, setIsMotorService] = useState(false);
  const [priceMapImage, setPriceMapImage] = useState(null);

  useEffect(() => {
    if (selectedCategory === "Decals & Wrap") {
      if (selectedType === "Car Service Layout") {
        setIsCarService(true);
        setIsMotorService(false);
        setCarPriceMode(false);
        setMultiPriceMode(false);
      } else if (selectedType === "Motor Service Layout") {
        setIsMotorService(true);
        setIsCarService(false);
        setMultiPriceMode(false);
        setCarPriceMode(false);
      } else {
        setIsCarService(false);
        setIsMotorService(false);
        setMultiPriceMode(false);
        setCarPriceMode(false);
      }
    } else {
      setIsCarService(false);
      setIsMotorService(false);
      setMultiPriceMode(false);
      setCarPriceMode(false);
    }
  }, [selectedCategory, selectedType]);

  // Success modal states
  const [showProductSuccessModal, setShowProductSuccessModal] = useState(false);
  const [addedProductName, setAddedProductName] = useState("");

  const availableTypes = useMemo(() => {
    return TYPES_BY_CATEGORY[selectedCategory] || [];
  }, [selectedCategory]);

  useEffect(() => {
    if (availableTypes.length > 0) {
      setSelectedType(availableTypes[0]);
    }
  }, [availableTypes]);

  const displayedColumnOrder = useMemo(() => {
    return columnOrder;
  }, [columnOrder]);

  useEffect(() => {
    setFormValues({
      product_name: "",
      product_price: "",
      product_description: "",
    });
  }, [selectedCategory, selectedType]);

  const groupProducts = (flatArray) => {
    const categoryMap = {};

    flatArray.forEach((p) => {
      const normalized = normalizeProduct(p);
      if (!normalized) return;

      const cat = normalized.product_category;
      const type = normalized.product_type;

      if (!categoryMap[cat])
        categoryMap[cat] = { category: cat, subcategories: {} };
      if (!categoryMap[cat].subcategories[type])
        categoryMap[cat].subcategories[type] = [];

      columnOrder.forEach((key) => {
        if (!(key in normalized)) {
          normalized[key] = key === "product_image" ? null : "";
        }
      });

      categoryMap[cat].subcategories[type].push(normalized);
    });

    return Object.values(categoryMap).map((cat) => ({
      category: cat.category,
      subcategories: Object.entries(cat.subcategories).map(([type, items]) => ({
        type,
        items,
      })),
    }));
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetchAllProducts();
      const flatArray = toArray(res);
      const formatted = groupProducts(flatArray);
      setProductsData(formatted);

      if (!statusFilter && formatted.length > 0) {
        setStatusFilter(formatted[0].category);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      setToast({ type: "error", message: "Failed to load products." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const displayedProducts = useMemo(() => {
    const cat = productsData.find((p) => p.category === statusFilter);
    return cat ? cat.subcategories : [];
  }, [productsData, statusFilter]);

  const insertProductIntoState = (product) => {
    if (!product || !product.product_id) return;

    setProductsData((prev) => {
      const next = prev.map((cat) => ({
        ...cat,
        subcategories: cat.subcategories.map((s) => ({ ...s })),
      }));

      let cat = next.find((c) => c.category === product.product_category);
      if (!cat) {
        next.push({
          category: product.product_category,
          subcategories: [{ type: product.product_type, items: [product] }],
        });
        return next;
      }

      let sub = cat.subcategories.find((s) => s.type === product.product_type);
      if (!sub) {
        cat.subcategories.push({
          type: product.product_type,
          items: [product],
        });
        return next;
      }

      const existsIndex = sub.items.findIndex(
        (it) => it.product_id === product.product_id,
      );
      if (existsIndex !== -1) {
        sub.items[existsIndex] = { ...sub.items[existsIndex], ...product };
      } else {
        sub.items.unshift(product);
      }

      return next;
    });
  };

  const updateProductInState = (product) => {
    if (!product || !product.product_id) return;

    setProductsData((prev) =>
      prev.map((cat) => {
        if (cat.category !== product.product_category) return cat;
        return {
          ...cat,
          subcategories: cat.subcategories.map((sub) => {
            if (sub.type !== product.product_type) return sub;
            return {
              ...sub,
              items: sub.items.map((it) =>
                it.product_id === product.product_id
                  ? { ...it, ...product }
                  : it,
              ),
            };
          }),
        };
      }),
    );
  };

  const deleteProductFromState = (product) => {
    if (!product || !product.product_id) return;

    setProductsData((prev) =>
      prev
        .map((cat) => {
          if (cat.category !== product.product_category) return cat;
          return {
            ...cat,
            subcategories: cat.subcategories
              .map((sub) => {
                if (sub.type !== product.product_type) return sub;
                return {
                  ...sub,
                  items: sub.items.filter(
                    (it) => it.product_id !== product.product_id,
                  ),
                };
              })
              .filter((sub) => sub.items.length > 0),
          };
        })
        .filter((cat) => cat.subcategories.length > 0),
    );
  };

  const handleAdd = async () => {
    if (!formValues.product_name.trim()) {
      setToast({ type: "error", message: "Product name is required." });
      return;
    }

    if (!selectedType) {
      setToast({ type: "error", message: "Please select a product type." });
      return;
    }

    const imageValidation = validateImage(newProductImage);
    if (!imageValidation.valid) {
      setToast({ type: "error", message: imageValidation.message });
      return;
    }

    if (multiPriceMode) {
      // Handle 3 API calls for Decals & Wrap
      const priceConfigs = [
        { type: "Motorbike Wrap", price: multiPrices.wrap },
        { type: "Motorbike Decal (Glossy)", price: multiPrices.glossy },
        { type: "Motorbike Decal (Hologram)", price: multiPrices.hologram },
      ].filter(p => parseFloat(p.price) > 0);

      if (priceConfigs.length === 0) {
        setToast({ type: "error", message: "Please enter at least one price." });
        return;
      }

      try {
        const token = sessionStorage.getItem("token");
        if (!token || token === "null") {
          setToast({ type: "error", message: "You are not logged in." });
          return;
        }

        setIsSubmitting(true);
        let lastProduct = null;

        for (const config of priceConfigs) {
          const formData = new FormData();
          formData.append("product_name", formValues.product_name);
          formData.append("product_price", String(parseFloat(config.price) || 0));
          formData.append("product_category", "Decals & Wrap");
          formData.append("product_type", config.type);
          formData.append("product_description", formValues.product_description || "");
          formData.append("is_customizable", formValues.is_customizable ? "1" : "0");
          if (newProductImage) formData.append("product_image", newProductImage);

          const res = await addProduct(formData);
          lastProduct = res?.data?.data ?? res?.data ?? res;
          lastProduct = normalizeProduct(lastProduct, "Decals & Wrap", config.type);
          insertProductIntoState(lastProduct);
        }

        setFormValues({ product_name: "", product_price: "", product_description: "", is_customizable: true, product_quantity: "0", shelf_location: "" });
        setMultiPrices({ wrap: "", glossy: "", hologram: "" });
        setNewProductImage(null);
        setShowAddForm(false);
        setAddedProductName(formValues.product_name);
        setShowProductSuccessModal(true);
      } catch (err) {
        console.error("Multi-add failed:", err);
        setToast({ type: "error", message: "Failed to add some or all products." });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (carPriceMode) {
      const priceConfigs = Object.entries(carPartsPrices)
        .filter(([_, price]) => parseFloat(price) > 0)
        .map(([part, price]) => ({ type: `${selectedType} - ${part}`, price }));

      if (priceConfigs.length === 0) {
        setToast({ type: "error", message: "Please enter at least one part price." });
        return;
      }

      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          setToast({ type: "error", message: "You are not logged in." });
          return;
        }

        setIsSubmitting(true);
        for (const config of priceConfigs) {
          const formData = new FormData();
          formData.append("product_name", formValues.product_name);
          formData.append("product_price", String(parseFloat(config.price) || 0));
          formData.append("product_category", "Decals & Wrap");
          formData.append("product_type", config.type);
          formData.append("product_description", formValues.product_description || "");
          formData.append("is_customizable", formValues.is_customizable ? "1" : "0");
          if (newProductImage) formData.append("product_image", newProductImage);

          const res = await addProduct(formData);
          let p = res?.data?.data ?? res?.data ?? res;
          p = normalizeProduct(p, "Decals & Wrap", config.type);
          insertProductIntoState(p);
        }

        setFormValues({ product_name: "", product_price: "", product_description: "", is_customizable: true, product_quantity: "0", shelf_location: "" });
        setCarPartsPrices(Object.keys(carPartsPrices).reduce((acc, k) => ({ ...acc, [k]: "" }), {}));
        setNewProductImage(null);
        setShowAddForm(false);
        setAddedProductName(formValues.product_name);
        setShowProductSuccessModal(true);
      } catch (err) {
        console.error("Car part add failed:", err);
        setToast({ type: "error", message: "Failed to add car parts." });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isCarService && (!priceMapImage || !newProductImage)) {
      setToast({ type: "error", message: "Both Price Map (Left) and Car Image (Right) are required for Car Service layout." });
      return;
    }

    const formData = new FormData();
    formData.append("product_name", formValues.product_name);
    formData.append(
      "product_price",
      String(parseFloat(formValues.product_price) || 0),
    );
    formData.append("product_category", selectedCategory);
    formData.append("product_type", selectedType);
    formData.append("product_description", formValues.product_description || "");
    formData.append("is_customizable", formValues.is_customizable ? "1" : "0");
    formData.append("product_quantity", String(formValues.product_quantity || 0));
    formData.append("shelf_location", String(formValues.shelf_location || ""));

    // Service Layout Fields
    formData.append("is_car_service", isCarService ? "1" : "0");
    formData.append("is_motor_service", isMotorService ? "1" : "0");
    if (priceMapImage) formData.append("price_map_image", priceMapImage);
    if (isMotorService) {
      formData.append("wrap_price", multiPrices.wrap || 0);
      formData.append("glossy_price", multiPrices.glossy || 0);
      formData.append("hologram_price", multiPrices.hologram || 0);
    }

    if (newProductImage) formData.append("product_image", newProductImage);

    try {
      // Robust token check
      const token = sessionStorage.getItem("token");
      const isValidToken = token && token !== "null" && token !== "undefined" && token.trim() !== "";
      const isDemoToken = token?.includes("mock-token") || token?.includes("sample-");

      if (!isValidToken) {
        setToast({
          type: "error",
          message: "You are not logged in. Please log in to your account first.",
        });
        return;
      }

      if (isDemoToken) {
        setToast({
          type: "error",
          message: "Demo accounts cannot add products. Please log in with a real account.",
        });
        return;
      }

      const res = await addProduct(formData);
      let product = res?.data?.data ?? res?.data ?? res;

      if (!product || !product.product_id) {
        throw new Error("No product returned from backend");
      }

      product = normalizeProduct(product, selectedCategory, selectedType);

      insertProductIntoState(product);
      setStatusFilter(product.product_category);

      // Notify global context to refresh
      window.dispatchEvent(new CustomEvent("product:added", { detail: product }));

      setFormValues({
        product_name: "",
        product_price: "",
        product_description: "",
        is_customizable: true,
        product_quantity: "0",
        shelf_location: "",
      });
      setNewProductImage(null);
      setPriceMapImage(null);
      setIsCarService(false);
      setIsMotorService(false);
      setMultiPrices({ wrap: "", glossy: "", hologram: "" });
      setShowAddForm(false);

      setAddedProductName(product.product_name);
      setShowProductSuccessModal(true);
    } catch (err) {
      console.error("Add product failed:", err);
      setToast({
        type: "error",
        message: err?.response?.data?.message || "Failed to add product.",
      });
    }
  };

  useEffect(() => {
    if (showProductSuccessModal) {
      const timer = setTimeout(() => {
        setShowProductSuccessModal(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [showProductSuccessModal]);

  const handleSave = async (product_id, subcatType, index) => {
    const editState = editingProduct[product_id];
    if (!editState || !product_id) {
      setToast({ type: "error", message: "No changes to save." });
      return;
    }

    const tempValues = editState.tempValues || {};
    const catObj = productsData.find((c) => c.category === statusFilter);
    const subObj = catObj?.subcategories.find((s) => s.type === subcatType);
    const originalItem = subObj?.items[index];

    if (!originalItem) {
      setToast({ type: "error", message: "Product not found." });
      return;
    }

    const merged = { ...originalItem, ...tempValues };
    const normalized = {
      product_id,
      product_name: (
        merged.product_name ??
        originalItem.product_name ??
        ""
      ).trim(),
      product_price: Number(
        merged.product_price ?? originalItem.product_price ?? 0,
      ),
      product_category:
        merged.product_category ??
        originalItem.product_category ??
        statusFilter ??
        "",
      product_type:
        merged.product_type ?? originalItem.product_type ?? subcatType ?? "",
      product_description:
        merged.product_description ?? originalItem.product_description ?? "",
      is_customizable:
        tempValues.is_customizable !== undefined
          ? tempValues.is_customizable
          : (originalItem.is_customizable !== undefined ? originalItem.is_customizable : true),
      product_quantity:
        tempValues.product_quantity !== undefined
          ? parseInt(tempValues.product_quantity)
          : (originalItem.product_quantity !== undefined ? parseInt(originalItem.product_quantity) : 0),
      shelf_location:
        tempValues.shelf_location !== undefined
          ? tempValues.shelf_location
          : (originalItem.shelf_location !== undefined ? originalItem.shelf_location : ""),
    };

    const newImageFile = tempValues.product_image;
    const hasNewImage = newImageFile instanceof File;

    const newMapFile = tempValues.price_map_image;
    const hasNewMap = newMapFile instanceof File;

    if (hasNewImage) {
      const imageValidation = validateImage(newImageFile);
      if (!imageValidation.valid) {
        setToast({ type: "error", message: imageValidation.message });
        return;
      }
    }

    if (hasNewMap) {
      const mapValidation = validateImage(newMapFile);
      if (!mapValidation.valid) {
        setToast({ type: "error", message: `Map: ${mapValidation.message}` });
        return;
      }
    }

    let dataToSend;
    if (hasNewImage || hasNewMap) {
      const formData = new FormData();
      formData.append("_method", "PATCH");
      formData.append("product_id", String(product_id));
      formData.append("product_category", normalized.product_category);
      formData.append("product_type", normalized.product_type);
      formData.append("is_customizable", normalized.is_customizable ? "1" : "0");

      Object.entries(normalized).forEach(([key, value]) => {
        if (
          key === "product_id" ||
          key === "product_category" ||
          key === "product_type"
        )
          return;
        formData.append(key, value != null ? String(value) : "");
      });

      if (hasNewImage) formData.append("product_image", newImageFile);
      if (hasNewMap) formData.append("price_map_image", newMapFile);

      dataToSend = formData;
    } else {
      dataToSend = { ...normalized, is_customizable: normalized.is_customizable ? 1 : 0 };
    }

    try {
      // Robust token check
      const token = sessionStorage.getItem("token");
      const isValidToken = token && token !== "null" && token !== "undefined" && token.trim() !== "";
      const isDemoToken = token?.includes("mock-token") || token?.includes("sample-");

      if (!isValidToken) {
        setToast({
          type: "error",
          message: "You are not logged in. Please log in to your account first.",
        });
        return;
      }

      if (isDemoToken) {
        setToast({
          type: "error",
          message: "Demo accounts cannot update products. Please log in with a real account.",
        });
        return;
      }

      const res = await updateProduct(product_id, dataToSend);
      let updatedProduct = res?.data?.data ?? res?.data ?? res;

      if (!updatedProduct || !updatedProduct.product_id) {
        throw new Error("No product returned from backend");
      }

      updatedProduct = normalizeProduct(
        updatedProduct,
        normalized.product_category,
        normalized.product_type,
      );

      const updatedImage = hasNewImage
        ? `${updatedProduct.product_image}?t=${Date.now()}`
        : updatedProduct.product_image;

      updateProductInState({ ...updatedProduct, product_image: updatedImage });

      // Notify global context to refresh
      window.dispatchEvent(new CustomEvent("product:updated", { detail: updatedProduct }));

      const preview = tempValues.product_imagePreview;
      if (preview?.startsWith("blob:")) {
        setTimeout(() => URL.revokeObjectURL(preview), 2000);
      }

      setEditingProduct((prev) => ({
        ...prev,
        [product_id]: { isEditing: false, tempValues: {} },
      }));

      setToast({ type: "updated", message: "Product updated successfully." });
    } catch (err) {
      setToast({
        type: "error",
        message: err?.response?.data?.message || "Update failed.",
      });
    }
  };

  const handleDelete = async (category, subType, index, product_id) => {
    if (confirmDelete !== product_id) {
      setConfirmDelete(product_id);
      return;
    }

    const catObj = productsData.find((c) => c.category === category);
    const subObj = catObj?.subcategories.find((s) => s.type === subType);
    const originalItem = subObj?.items[index];

    if (!originalItem) return;

    try {
      await deleteProduct(product_id);
      deleteProductFromState({ ...originalItem });
      setConfirmDelete(null);
      setToast({ type: "deleted", message: "Product deleted successfully." });
    } catch (err) {
      setConfirmDelete(null);
      setToast({ type: "error", message: "Delete failed." });
    }
  };

  const handleCancelEdit = (product_id) => {
    const oldImagePreview =
      editingProduct[product_id]?.tempValues?.product_imagePreview;
    if (oldImagePreview) URL.revokeObjectURL(oldImagePreview);

    const oldMapPreview =
      editingProduct[product_id]?.tempValues?.price_map_imagePreview;
    if (oldMapPreview) URL.revokeObjectURL(oldMapPreview);

    setEditingProduct((prev) => ({
      ...prev,
      [product_id]: { isEditing: false, tempValues: {} },
    }));
  };

  const withBust = (url) => {
    if (!url || typeof url !== "string" || url.trim() === "" || url === "null") {
      return PLACEHOLDER_IMAGE;
    }
    if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("data:image")) return url;
    return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  };

  return (
    <div className="p-3 bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 min-h-[calc(100vh-2.5rem)] flex flex-col">
      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, message: "" })}
      />

      <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Products</h1>

      <div className="flex items-center mb-6 gap-2">
        <div className="flex gap-4 font-semibold text-sm">
          {CATEGORIES.map((cat) => {
            const catData = productsData.find((c) => c.category === cat);
            const count = catData
              ? catData.subcategories.reduce((sum, s) => sum + s.items.length, 0)
              : 0;
            return (
              <button
                key={cat}
                onClick={() => setStatusFilter(cat)}
                className={`pb-2 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${statusFilter === cat
                    ? "border-[#FDE31E] font-bold text-gray-900"
                    : count === 0
                      ? "text-gray-300 border-transparent hover:text-gray-400 hover:border-gray-200"
                      : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                {cat}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${statusFilter === cat
                    ? 'bg-yellow-100 text-yellow-700'
                    : count === 0
                      ? 'bg-gray-100 text-gray-300'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto shrink-0">
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FDE31E] hover:bg-yellow-400 transition font-bold"
          >
            <span className="text-[13px]">Add Product</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showAddForm ? 'rotate-180' : 'rotate-0'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {showProductSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-50 mb-5">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Success</h3>
            <p className="text-gray-500 text-sm mb-6">
              {addedProductName ? `"${addedProductName}" added to catalog.` : "Product added successfully."}
            </p>
            <button
              onClick={() => setShowProductSuccessModal(false)}
              className="w-full px-6 py-2.5 bg-[#FDE31E] text-sm font-bold rounded-lg hover:bg-yellow-400 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <AddProductForm
          formValues={formValues}
          setFormValues={setFormValues}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          newProductImage={newProductImage}
          setNewProductImage={setNewProductImage}
          handleAdd={handleAdd}
          resetAddForm={() => {
            setFormValues({ product_name: "", product_price: "", product_description: "", is_customizable: true, product_quantity: "0", shelf_location: "" });
            setMultiPrices({ wrap: "", glossy: "", hologram: "" });
            setCarPartsPrices(Object.keys(carPartsPrices).reduce((acc, k) => ({ ...acc, [k]: "" }), {}));
            setNewProductImage(null);
            setPriceMapImage(null);
            setIsCarService(false);
            setIsMotorService(false);
            setShowAddForm(false);
          }}
          categoryOptions={CATEGORIES}
          availableTypes={availableTypes}
          columnOrder={columnOrder}
          multiPriceMode={multiPriceMode}
          multiPrices={multiPrices}
          setMultiPrices={setMultiPrices}
          carPriceMode={carPriceMode}
          carPartsPrices={carPartsPrices}
          setCarPartsPrices={setCarPartsPrices}
          isSubmitting={isSubmitting}
          isCarService={isCarService}
          setIsCarService={setIsCarService}
          isMotorService={isMotorService}
          setIsMotorService={setIsMotorService}
          priceMapImage={priceMapImage}
          setPriceMapImage={setPriceMapImage}
        />
      )}

      {loading ? (
        <div className="p-20 text-center flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-400 uppercase">Loading products...</p>
        </div>
      ) : (
        <ProductTable
          displayedProducts={displayedProducts}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          handleSave={handleSave}
          handleDelete={handleDelete}
          handleCancelEdit={handleCancelEdit}
          statusFilter={statusFilter}
          displayedColumnOrder={displayedColumnOrder}
          withBust={withBust}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          setActiveVariationsProduct={setActiveVariationsProduct}
        />
      )}

      {activeVariationsProduct && (
        <ProductVariationsModal
          product={activeVariationsProduct}
          onClose={() => {
            setActiveVariationsProduct(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
};

/* ===================================
   ADD PRODUCT FORM – SIMPLIFIED (no Assorted special case)
   =================================== */

const AddProductForm = ({
  formValues,
  setFormValues,
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  newProductImage,
  setNewProductImage,
  handleAdd,
  resetAddForm,
  categoryOptions,
  availableTypes,
  columnOrder,
  multiPriceMode,
  multiPrices,
  setMultiPrices,
  carPriceMode,
  carPartsPrices,
  setCarPartsPrices,
  isSubmitting,
  isCarService,
  setIsCarService,
  isMotorService,
  setIsMotorService,
  priceMapImage,
  setPriceMapImage,
}) => {
  const isSignage = selectedCategory === "Signage";
  const isGraphicServices = selectedCategory === "Graphic Services";

  const signageSubTypes = SIGNAGE_SUBTYPES[selectedType] || [];
  const graphicTiers = GRAPHIC_SERVICE_TIERS[selectedType] || [];
  const giveawayOptions =
    selectedCategory === "Giveaways" ? GIVEAWAY_OPTIONS[selectedType] || [] : [];

  // Helper to update fields based on sub-item selection
  const handleSignageSubItemChange = (subItemName) => {
    const subItem = signageSubTypes.find((s) => s.name === subItemName);
    if (subItem) {
      setFormValues((prev) => ({
        ...prev,
        product_name: subItem.name,
        product_description: subItem.description,
      }));
    }
  };

  const handleGraphicTierChange = (tierName) => {
    const tier = graphicTiers.find((t) => t.name === tierName);
    if (tier) {
      setFormValues((prev) => ({
        ...prev,
        product_name: tier.name,
        product_price: tier.price,
        product_description: "minimum purchase order",
      }));
    }
  };

  return (
    <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Add New Product</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {/* Category */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-white cursor-pointer"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-white cursor-pointer"
          >
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Conditional Dropdown for Signage Sub-types */}
        {isSignage && signageSubTypes.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Sub-type <span className="text-red-500">*</span>
            </label>
            <select
              onChange={(e) => handleSignageSubItemChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-white cursor-pointer"
            >
              <option value="">Select Sub-type</option>
              {signageSubTypes.map((sub) => (
                <option key={sub.name} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Conditional Dropdown for Graphic Service Tiers */}
        {isGraphicServices && graphicTiers.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Tier <span className="text-red-500">*</span>
            </label>
            <select
              onChange={(e) => handleGraphicTierChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-white cursor-pointer"
            >
              <option value="">Select Tier</option>
              {graphicTiers.map((tier) => (
                <option key={tier.name} value={tier.name}>
                  {tier.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {giveawayOptions.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Select Sub-type <span className="text-red-500">*</span>
            </label>
            <select
              value={(() => {
                const desc = formValues.product_description || "";
                if (selectedType === "Sintra Board") {
                  if (desc.includes(" - Calling Cards")) return "Calling Cards";
                  if (desc.includes(" - Standee")) return "Standee";
                  return "";
                }
                return desc;
              })()}
              onChange={(e) => {
                const val = e.target.value;
                setFormValues((prev) => ({
                  ...prev,
                  product_description: selectedType === "Sintra Board" ? `Sintra Board - ${val}` : val,
                  // For Sintra Board, also store the subtype in product_name so the modal routing works
                  ...(selectedType === "Sintra Board" ? { product_name: val } : {}),
                }));
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-white cursor-pointer"
            >
              <option value="">Select Sub-type</option>
              {giveawayOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Third level dropdown for Sintra Board > Calling Cards */}
        {selectedType === "Sintra Board" && (formValues.product_description?.includes("Calling Cards")) && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Card Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formValues.product_description?.split(" - ").length > 2 ? formValues.product_description.split(" - ")[2] : ""}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  product_description: `Sintra Board - Calling Cards - ${e.target.value}`,
                }))
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-white cursor-pointer"
            >
              <option value="">Select Card Type</option>
              {GIVEAWAY_OPTIONS["Calling Cards"].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Name (Hidden for Services) */}
        {!isCarService && !isMotorService && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formValues.product_name}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, product_name: e.target.value }))
              }
              placeholder="Enter product name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>
        )}

        {/* Description Field */}
        <div className="col-span-full lg:col-span-2">
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Description
          </label>
          <textarea
            value={formValues.product_description}
            onChange={(e) =>
              setFormValues((prev) => ({ ...prev, product_description: e.target.value }))
            }
            placeholder="Enter product description"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none min-h-[100px] resize-y"
          />
        </div>

        {/* Multi-Price Fields for Decals & Wrap */}
        {multiPriceMode ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Wrap Price (₱)</label>
              <input
                type="number"
                value={multiPrices.wrap}
                onChange={(e) => setMultiPrices(p => ({ ...p, wrap: e.target.value }))}
                placeholder="Enter wrap price"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Glossy Decal Price (₱)</label>
              <input
                type="number"
                value={multiPrices.glossy}
                onChange={(e) => setMultiPrices(p => ({ ...p, glossy: e.target.value }))}
                placeholder="Enter glossy price"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Hologram Decal Price (₱)</label>
              <input
                type="number"
                value={multiPrices.hologram}
                onChange={(e) => setMultiPrices(p => ({ ...p, hologram: e.target.value }))}
                placeholder="Enter hologram price"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
          </>
        ) : carPriceMode ? (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h4 className="col-span-full font-bold text-gray-900 mb-2">Car Part Pricing (Enter prices for applicable parts)</h4>
            {Object.keys(carPartsPrices).map(part => (
              <div key={part}>
                <label className="block text-xs font-bold mb-1.5 text-gray-500 uppercase tracking-wider">{part} Price (₱)</label>
                <input
                  type="number"
                  value={carPartsPrices[part]}
                  onChange={(e) => setCarPartsPrices(p => ({ ...p, [part]: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition"
                />
              </div>
            ))}
          </div>
        ) : !isCarService && !isMotorService ? (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formValues.product_price}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, product_price: e.target.value }))
              }
              placeholder="Enter price"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>
        ) : null}

        {/* Conditional Service Fields */}
        {isCarService && (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-5 bg-yellow-50/50 p-6 rounded-2xl border border-yellow-100">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">Car Service Name (e.g. Sedan, SUV/Pickup) <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formValues.product_name}
                onChange={(e) => setFormValues(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="Enter car type name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">
                Price Map Image (Left side) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPriceMapImage(e.target.files?.[0] ?? null)}
                className="w-full text-sm border border-gray-300 rounded-lg file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-gray-700 file:font-semibold hover:file:bg-gray-100 cursor-pointer"
              />
              {priceMapImage && (
                <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                  <img src={URL.createObjectURL(priceMapImage)} alt="Map Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">
                Car Image (Right side) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewProductImage(e.target.files?.[0] ?? null)}
                className="w-full text-sm border border-gray-300 rounded-lg file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-gray-700 file:font-semibold hover:file:bg-gray-100 cursor-pointer"
              />
              {newProductImage && (
                <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                  <img src={URL.createObjectURL(newProductImage)} alt="Car Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        )}

        {isMotorService && (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 bg-yellow-50/50 p-6 rounded-2xl border border-yellow-100">
            <div className="col-span-full md:col-span-1">
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">Motorbike Model Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formValues.product_name}
                onChange={(e) => setFormValues(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="e.g. Yamaha Mio Gravis"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">Wrap Price (₱)</label>
              <input
                type="number"
                value={multiPrices.wrap}
                onChange={(e) => setMultiPrices(p => ({ ...p, wrap: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">Glossy Price (₱)</label>
              <input
                type="number"
                value={multiPrices.glossy}
                onChange={(e) => setMultiPrices(p => ({ ...p, glossy: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">Hologram Price (₱)</label>
              <input
                type="number"
                value={multiPrices.hologram}
                onChange={(e) => setMultiPrices(p => ({ ...p, hologram: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-bold mb-2 text-gray-700 uppercase italic tracking-tighter">Motorbike Model Image <span className="text-red-500">*</span></label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewProductImage(e.target.files?.[0] ?? null)}
                className="w-full text-sm border border-gray-300 rounded-lg file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-gray-700 file:font-semibold hover:file:bg-gray-100 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Product Nature */}
        {selectedCategory !== "Decals & Wrap" && (
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Product Nature <span className="text-red-500">*</span>
          </label>
          <select
            value={formValues.is_customizable ? "customizable" : "ready_made"}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                is_customizable: e.target.value === "customizable",
              }))
            }
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition bg-white cursor-pointer"
          >
            <option value="customizable">Customizable</option>
            <option value="ready_made">Ready Made</option>
          </select>
        </div>
        )}

        {/* Stock & Shelf Location (Ready Made Only) */}
        {!formValues.is_customizable && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formValues.product_quantity}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, product_quantity: e.target.value }))
                }
                placeholder="Enter stock quantity"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Shelf Location
              </label>
              <input
                type="text"
                value={formValues.shelf_location}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, shelf_location: e.target.value }))
                }
                placeholder="e.g. Rack A-3, Shelf B2"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>
          </>
        )}

        {/* Image (Standard) */}
        {!isCarService && !isMotorService && (
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Product Image <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewProductImage(e.target.files?.[0] ?? null)}
              className="w-full text-sm border border-gray-300 rounded-lg file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-gray-50 file:text-gray-700 file:font-semibold hover:file:bg-gray-100 cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={handleAdd}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-[#FDE31E] rounded-lg hover:bg-yellow-400 font-bold transition shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Adding..." : "Add Product"}
        </button>
        <button
          onClick={resetAddForm}
          className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

/* ===================================
   PRODUCT TABLE COMPONENT (unchanged)
   =================================== */

const ProductTable = ({
  displayedProducts,
  editingProduct,
  setEditingProduct,
  handleSave,
  handleDelete,
  handleCancelEdit,
  statusFilter,
  displayedColumnOrder,
  withBust,
  confirmDelete,
  setConfirmDelete,
  setActiveVariationsProduct,
}) => (
  <div className="flex flex-col w-full overflow-hidden flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-between">
      <p className="text-xs font-bold text-gray-400 uppercase">
        Product Catalog
      </p>
    </div>

    <div className="flex-1 overflow-auto custom-scrollbar">
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase w-[15%]">
              Type
            </th>
            {displayedColumnOrder.map((key) => (
              <th
                key={key}
                className={`px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase ${key === 'product_name' ? 'w-[20%]' : key === 'product_image' ? 'w-[120px]' : ''}`}
              >
                {key
                  .replace("product_", "")
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </th>
            ))}
            {statusFilter !== "Decals & Wrap" && (
              <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 uppercase w-[110px]">
                Nature
              </th>
            )}
            <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 uppercase w-[90px]">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50">
          {displayedProducts.length === 0 ? (
            <tr>
              <td
                colSpan={displayedColumnOrder.length + 3}
                className="text-center py-20"
              >
                <p className="font-bold text-gray-400 uppercase">No products in this category yet.</p>
              </td>
            </tr>
          ) : (
            displayedProducts.flatMap((subcat) =>
              subcat.items.map((item, index) => {
                const editState = editingProduct[item.product_id] || {
                  isEditing: false,
                  tempValues: {},
                };
                const isEditing = editState.isEditing;
                const tempValues = editState.tempValues;

                const imageSrc = isEditing
                  ? tempValues.product_imagePreview || item.product_image
                  : item.product_image;
                const priceMapSrc = isEditing
                  ? tempValues.price_map_imagePreview || item.price_map_image
                  : item.price_map_image;

                return (
                  <tr
                    key={`${subcat.type}-${item.product_id}`}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg font-black text-[10px] bg-gray-50 text-gray-500 border border-gray-100 uppercase">
                        {subcat.type}
                      </span>
                    </td>

                    {displayedColumnOrder.map((key) => (
                      <td key={key} className="px-6 py-4">
                        {key === "product_image" ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              {/* Main Image / Car Image */}
                              <div className="relative w-20 h-20 group/img">
                                {imageSrc ? (
                                  <img
                                    src={withBust(imageSrc)}
                                    alt={item.product_name || "product"}
                                    className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm transition-all group-hover/img:shadow-md"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-300 uppercase">No Image</span>
                                  </div>
                                )}
                                {item.is_car_service && <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">CAR</span>}
                              </div>

                              {/* Price Map Image for Car Services */}
                              {item.is_car_service && (
                                <div className="relative w-20 h-20 group/map">
                                  {item.price_map_image ? (
                                    <img
                                      src={withBust(priceMapSrc)}
                                      alt="Price Map"
                                      className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm transition-all group-hover/map:shadow-md"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                                      <span className="text-[10px] font-bold text-gray-300 uppercase">No Map</span>
                                    </div>
                                  )}
                                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[8px] px-1.5 py-0.5 rounded-full font-bold">MAP</span>
                                </div>
                              )}
                            </div>

                            {isEditing && (
                              <div className="flex flex-col gap-2">
                                <label className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[10px] font-black uppercase hover:bg-black transition-all active:scale-95 shadow-sm">
                                  {item.is_car_service ? "Change Image" : "Change"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      const oldPreview =
                                        editingProduct[item.product_id]?.tempValues
                                          ?.product_imagePreview;
                                      if (oldPreview?.startsWith("blob:"))
                                        URL.revokeObjectURL(oldPreview);

                                      setEditingProduct((prev) => ({
                                        ...prev,
                                        [item.product_id]: {
                                          ...prev[item.product_id],
                                          isEditing: true,
                                          tempValues: {
                                            ...prev[item.product_id]?.tempValues,
                                            product_image: file,
                                            product_imagePreview:
                                              URL.createObjectURL(file),
                                          },
                                        },
                                      }));

                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {item.is_car_service && (
                                  <label className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-[10px] font-black uppercase hover:bg-yellow-500 transition-all active:scale-95 shadow-sm">
                                    Change Map
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const oldPreview =
                                          editingProduct[item.product_id]?.tempValues
                                            ?.price_map_imagePreview;
                                        if (oldPreview?.startsWith("blob:"))
                                          URL.revokeObjectURL(oldPreview);

                                        setEditingProduct((prev) => ({
                                          ...prev,
                                          [item.product_id]: {
                                            ...prev[item.product_id],
                                            isEditing: true,
                                            tempValues: {
                                              ...prev[item.product_id]?.tempValues,
                                              price_map_image: file,
                                              price_map_imagePreview:
                                                URL.createObjectURL(file),
                                            },
                                          },
                                        }));

                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        ) : key === "product_description" &&
                          statusFilter === "Giveaways" &&
                          GIVEAWAY_OPTIONS[subcat.type] ? (
                          <select
                            value={
                              isEditing
                                ? (tempValues[key] ?? item[key] ?? "")
                                : (item[key] ?? "")
                            }
                            disabled={!isEditing}
                            onChange={(e) =>
                              setEditingProduct((prev) => ({
                                ...prev,
                                [item.product_id]: {
                                  ...prev[item.product_id],
                                  isEditing: true,
                                  tempValues: {
                                    ...prev[item.product_id]?.tempValues,
                                    [key]: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={`w-full px-4 py-2 rounded-xl outline-none transition text-sm font-medium ${!isEditing
                              ? "bg-transparent border-transparent cursor-default text-gray-600"
                              : "bg-gray-50 border border-gray-100 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10"
                              }`}
                          >
                            <option value="">Select Sub-type</option>
                            {GIVEAWAY_OPTIONS[subcat.type].map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          key === "product_description" ? (
                            isEditing ? (
                              <textarea
                                value={tempValues[key] ?? item[key] ?? ""}
                                placeholder={`Enter description`}
                                onChange={(e) =>
                                  setEditingProduct((prev) => ({
                                    ...prev,
                                    [item.product_id]: {
                                      ...prev[item.product_id],
                                      isEditing: true,
                                      tempValues: {
                                        ...prev[item.product_id]?.tempValues,
                                        [key]: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full px-4 py-2 rounded-xl outline-none transition text-sm font-medium min-h-[100px] resize-y bg-gray-50 border border-gray-100 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10"
                              />
                            ) : (
                              <div className="max-w-[200px]">
                                {item[key] ? (
                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                    {item[key]}
                                  </p>
                                ) : (
                                  <span className="text-gray-300 italic text-[10px]">No description</span>
                                )}
                              </div>
                            )
                          ) : (
                            <input
                              type={key.includes("price") ? "number" : "text"}
                              value={
                                isEditing
                                  ? (tempValues[key] ?? item[key] ?? "")
                                  : (item[key] ?? "")
                              }
                              disabled={!isEditing}
                              placeholder={`Enter ${key.replace("product_", "").replace("_", " ")}`}
                              onChange={(e) =>
                                setEditingProduct((prev) => ({
                                  ...prev,
                                  [item.product_id]: {
                                    ...prev[item.product_id],
                                    isEditing: true,
                                    tempValues: {
                                      ...prev[item.product_id]?.tempValues,
                                      [key]: e.target.value,
                                    },
                                  },
                                }))
                              }
                              className={`w-full px-4 py-2 rounded-xl outline-none transition text-sm font-bold ${!isEditing
                                ? "bg-transparent border-transparent cursor-default text-gray-900"
                                : "bg-gray-50 border border-gray-100 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10"
                                } ${key.includes("price") ? "text-yellow-700" : ""}`}
                            />
                          )
                        )}
                      </td>
                    ))}

                    {/* Nature / is_customizable column */}
                    {statusFilter !== "Decals & Wrap" && (
                    <td className="px-4 py-4 text-center">
                      {((item.product_category || '').toLowerCase().includes('decal') || (item.product_category || '').toLowerCase().includes('wrap') || item.is_car_service || item.is_motor_service) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase text-gray-400 border border-gray-200 bg-gray-50">
                          Service Only
                        </span>
                      ) : isEditing ? (
                        <select
                          value={
                            tempValues.is_customizable !== undefined
                              ? (tempValues.is_customizable ? "customizable" : "ready_made")
                              : (item.is_customizable ? "customizable" : "ready_made")
                          }
                          onChange={(e) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              [item.product_id]: {
                                ...prev[item.product_id],
                                isEditing: true,
                                tempValues: {
                                  ...prev[item.product_id]?.tempValues,
                                  is_customizable: e.target.value === "customizable",
                                },
                              },
                            }))
                          }
                          className="text-[10px] font-bold px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 outline-none cursor-pointer"
                        >
                          <option value="customizable">Customizable</option>
                          <option value="ready_made">Ready Made</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase ${item.is_customizable
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-green-50 text-green-600 border border-green-100'
                          }`}>
                          {item.is_customizable ? 'Customizable' : 'Ready Made'}
                        </span>
                      )}
                    </td>
                    )}

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 items-center">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() =>
                                handleSave(item.product_id, subcat.type, index)
                              }
                              className="w-full bg-green-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 transition-all shadow-sm active:scale-95"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => handleCancelEdit(item.product_id)}
                              className="w-full bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                setEditingProduct((prev) => ({
                                  ...prev,
                                  [item.product_id]: {
                                    isEditing: true,
                                    tempValues: {
                                      product_name: item.product_name,
                                      product_price: item.product_price,
                                      product_description: item.product_description,
                                      is_customizable: item.is_customizable !== undefined ? item.is_customizable : true,
                                      product_imagePreview:
                                        item.product_image || null,
                                      price_map_imagePreview:
                                        item.price_map_image || null,
                                    },
                                  },
                                }))
                              }
                              className="w-full bg-gray-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all shadow-sm active:scale-95"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setActiveVariationsProduct(item)}
                              className="w-full bg-[#FDE31E] text-gray-900 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-yellow-400 transition-all shadow-sm active:scale-95"
                            >
                              Variations
                            </button>
                            {confirmDelete === item.product_id ? (
                              <div className="flex flex-col gap-1 w-full">
                                <p className="text-[9px] font-black text-red-500 uppercase text-center">Sure?</p>
                                <button
                                  onClick={() =>
                                    handleDelete(statusFilter, subcat.type, index, item.product_id)
                                  }
                                  className="w-full bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all active:scale-95"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="w-full bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all active:scale-95"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(item.product_id)}
                                className="w-full bg-red-50 text-red-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all active:scale-95"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }),
            )
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default SuperAdminProducts;