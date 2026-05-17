// src/services/PrintingService.js
import dscLogo from '../assets/dsclogo.png';

/**
 * Converts the local logo asset to a Base64 string for embedding in print HTML.
 */
export const getLogoBase64 = () => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            console.warn("Failed to load logo for printing, using empty string.");
            resolve("");
        };
        img.src = dscLogo;
    });
};

/**
 * Handles the actual browser print command using an iframe.
 */
export const handleBrowserPrint = (htmlContent) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow.focus();
    // Wait a bit for images/styles to load if any
    setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
};

/**
 * Shared CSS for printed receipts/invoices.
 */
export const getPrintStyles = () => `
    @page { size: 80mm auto; margin: 0; }
    body { 
        font-family: 'Courier New', Courier, monospace; 
        width: 80mm; 
        margin: 0; 
        padding: 5mm; 
        font-size: 12px; 
        line-height: 1.2;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .dashed-line { border-top: 1px dashed #000; margin: 5px 0; }
    .logo-container { margin-bottom: 10px; }
    .logo { width: 40mm; height: auto; }
    .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .item-name { flex: 1; }
    .footer { margin-top: 15px; font-size: 10px; }
`;

/**
 * Builds HTML for a standard sales receipt.
 */
export const buildReceiptHTML = (data, logoBase64) => {
    const { invoiceNo, date, items, total, customerName } = data;
    const styles = getPrintStyles();

    return `
        <html>
        <head><style>${styles}</style></head>
        <body>
            <div class="text-center logo-container">
                <img src="${logoBase64}" class="logo" />
            </div>
            <div class="text-center bold">DSC STICKER SHOP</div>
            <div class="text-center">Davao City, Philippines</div>
            <div class="dashed-line"></div>
            <div>Invoice: ${invoiceNo}</div>
            <div>Date: ${date}</div>
            <div>Customer: ${customerName || 'Walk-in'}</div>
            <div class="dashed-line"></div>
            <div class="bold item-row">
                <span class="item-name">Item</span>
                <span>Qty</span>
                <span>Price</span>
            </div>
            ${items.map(item => `
                <div class="item-row">
                    <span class="item-name">${item.name}</span>
                    <span>${item.qty}</span>
                    <span>${item.price}</span>
                </div>
            `).join('')}
            <div class="dashed-line"></div>
            <div class="item-row bold">
                <span>TOTAL</span>
                <span>${total}</span>
            </div>
            <div class="dashed-line"></div>
            <div class="text-center footer">
                Thank you for your business!<br>
                This is a computer-generated receipt.
            </div>
        </body>
        </html>
    `;
};

/**
 * Builds HTML for printing a single product (e.g. for labels).
 */
export const buildProductPrintHTML = (product, logoBase64) => {
    const styles = getPrintStyles();
    return `
        <html>
        <head><style>${styles}</style></head>
        <body>
            <div class="text-center logo-container">
                <img src="${logoBase64}" class="logo" />
            </div>
            <div class="text-center bold">${product.product_name}</div>
            <div class="text-center">Price: PHP ${product.product_price}</div>
            <div class="dashed-line"></div>
            <div class="text-center footer">DSC STICKER</div>
        </body>
        </html>
    `;
};

/**
 * Shared Print Icon component.
 */
export const PrintIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);
