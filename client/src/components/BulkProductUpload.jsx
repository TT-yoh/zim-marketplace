// client/src/components/BulkProductUpload.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from './supabaseClient.js';

const normalizeKey = (val) => {
    if (!val) return '';
    return val.toString()
        .replace(/^["']|["']$/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
};

const readFileAsDataUrl = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
};

const compressImageToDataUrl = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = async () => resolve(await readFileAsDataUrl(file));
            img.src = e.target.result;
        };
        reader.onerror = async () => resolve(await readFileAsDataUrl(file));
        reader.readAsDataURL(file);
    });
};

const findMatchingPhotoUrl = (resolvedUrlsMap, itemNo, name, rawUrl, rowIndex) => {
    if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
        return rawUrl;
    }

    const normItemNo = normalizeKey(itemNo);
    const normName = normalizeKey(name);

    // 1. Direct Exact SKU match
    if (normItemNo && resolvedUrlsMap[normItemNo]) {
        return resolvedUrlsMap[normItemNo];
    }

    // 2. Direct Exact Name match
    if (normName && resolvedUrlsMap[normName]) {
        return resolvedUrlsMap[normName];
    }

    // 3. Prefix Match for SKU (e.g. ELEC-001_front.jpg matches SKU ELEC-001)
    if (normItemNo && normItemNo.length >= 3) {
        for (const [key, url] of Object.entries(resolvedUrlsMap)) {
            if (key.startsWith(normItemNo) || normItemNo.startsWith(key)) {
                return url;
            }
        }
    }

    // 4. Prefix Match for Product Name (e.g. Wireless_Headphones_main.jpg matches "Wireless Headphones")
    if (normName && normName.length >= 3) {
        for (const [key, url] of Object.entries(resolvedUrlsMap)) {
            if (key.startsWith(normName) || normName.startsWith(key)) {
                return url;
            }
        }
    }

    // 5. Substring Match for SKU or Name
    if (normItemNo && normItemNo.length >= 3) {
        for (const [key, url] of Object.entries(resolvedUrlsMap)) {
            if (key.includes(normItemNo) || normItemNo.includes(key)) {
                return url;
            }
        }
    }
    if (normName && normName.length >= 3) {
        for (const [key, url] of Object.entries(resolvedUrlsMap)) {
            if (key.includes(normName) || normName.includes(key)) {
                return url;
            }
        }
    }

    // 6. Row Index Match (e.g. 1.jpg, 01.jpg, 001.jpg matching Row 1)
    if (typeof rowIndex === 'number') {
        const rowStr = (rowIndex + 1).toString();
        const rowPadded2 = rowStr.padStart(2, '0');
        const rowPadded3 = rowStr.padStart(3, '0');

        if (resolvedUrlsMap[rowStr]) return resolvedUrlsMap[rowStr];
        if (resolvedUrlsMap[rowPadded2]) return resolvedUrlsMap[rowPadded2];
        if (resolvedUrlsMap[rowPadded3]) return resolvedUrlsMap[rowPadded3];
    }

    return null;
};

export function BulkProductUpload({ shopId, onUploadSuccess }) {
    const [parsedData, setParsedData] = useState([]);
    const [bulkImagesMap, setBulkImagesMap] = useState({}); // { 'normKey': File }
    const [uploading, setUploading] = useState(false);
    const [uploadProgressMsg, setUploadProgressMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleBulkImagesSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const map = { ...bulkImagesMap };

            files.forEach(file => {
                const nameWithoutExt = file.name.lastIndexOf('.') > 0 
                    ? file.name.substring(0, file.name.lastIndexOf('.')) 
                    : file.name;
                const normKey = normalizeKey(nameWithoutExt);
                if (normKey) {
                    map[normKey] = file;
                }
            });

            setBulkImagesMap(map);
        }
    };

    const expectedHeaders = [
        'Item No', 
        'Name', 
        'Unit', 
        'Excl VAT', 
        'Incl VAT', 
        'Stock_Optional', 
        'Category_Optional', 
        'SubCategory_Optional', 
        'Colors_Optional', 
        'Sizes_Optional', 
        'Image_URL_Optional'
    ];

    const downloadTemplate = () => {
        const csvRows = [
            expectedHeaders.join(","),
            'ELEC-001,"Wireless Noise-Canceling Headphones",EA,80.00,92.00,25,Electronics,Audio & Speakers,"Black;Silver","Standard",https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
            'AUTO-631,"Ducellier Heavy Duty Battery 12V",EA,65.59,75.76,10,Auto Parts,Batteries & Electrical,"Black","12V-60Ah",',
            'FASH-102,"Men Cotton Denim Jacket",EA,25.00,28.75,40,Fashion,Men\'s Wear,"Blue;Black","M;L;XL",'
        ];
        
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "ZimMarket_Bulk_Upload_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().replace(/^["']|["']$/g, ''),
            complete: (results) => {
                if (results.errors.length > 0) {
                    setErrorMsg("Error parsing CSV. Please check formatting.");
                    return;
                }
                
                // Validate headers flexibly across various POS and Excel naming conventions
                const headers = (results.meta.fields || []).map(h => h.toLowerCase());
                const hasName = headers.some(h => ['name', 'product name', 'title', 'item', 'item name', 'description', 'product'].includes(h));
                const hasPrice = headers.some(h => ['incl vat', 'incl_vat', 'price_incl', 'inclvat', 'price incl vat', 'price', 'retail price', 'excl vat', 'cost'].includes(h));

                if (!hasName || !hasPrice) {
                    setErrorMsg("CSV must contain a Product Name (or Title) and Price (or Incl VAT) column.");
                    return;
                }

                setParsedData(results.data);
                setErrorMsg(null);
            },
            error: (err) => {
                setErrorMsg(`Failed to read file: ${err.message}`);
            }
        });
    };

    const handleBulkSubmit = async () => {
        if (parsedData.length === 0) return;
        setUploading(true);
        setErrorMsg(null);
        setUploadProgressMsg('Analyzing CSV rows and matching photo filenames...');

        try {
            // 0. Verify the vendor is authenticated — storage RLS requires a valid session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                // Try to refresh the session in case the token just expired
                const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError || !refreshed.session) {
                    throw new Error('You are not logged in. Please refresh the page and log back in before uploading photos.');
                }
            }

            // 1. Process and upload photos
            const photoKeys = Object.keys(bulkImagesMap);
            const totalMatched = photoKeys.length;
            const resolvedImageUrls = {};

            // 2. Upload photos with live progress feedback & compressed Data URL fallback
            for (let i = 0; i < totalMatched; i++) {
                const key = photoKeys[i];
                const file = bulkImagesMap[key];
                setUploadProgressMsg(`Uploading photo ${i + 1} of ${totalMatched}: ${file.name}...`);

                try {
                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const fileName = `${shopId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${safeName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(fileName, file, { 
                            cacheControl: '3600', 
                            upsert: false,
                            contentType: file.type || 'image/jpeg'
                        });

                    if (!uploadError) {
                        const { data: publicUrlData } = supabase.storage
                            .from('product-images')
                            .getPublicUrl(fileName);
                        resolvedImageUrls[key] = publicUrlData.publicUrl;
                    } else {
                        console.warn(`Supabase Storage upload warning for ${file.name}: ${uploadError.message}`);
                        // Fallback to compressed Data URL if storage bucket upload fails
                        const dataUrl = await compressImageToDataUrl(file);
                        if (dataUrl) resolvedImageUrls[key] = dataUrl;
                    }
                } catch (err) {
                    console.warn(`Storage exception for ${file.name}: ${err.message}`);
                    const dataUrl = await compressImageToDataUrl(file);
                    if (dataUrl) resolvedImageUrls[key] = dataUrl;
                }
            }

            setUploadProgressMsg('Importing products into ZimMarket catalog...');

            const batch = parsedData.map((row, index) => {
                const itemNoVal = row['Item No'] || row['Item_No'] || row['SKU'] || row['ItemNo'] || row['Code'] || row['Item Code'] || row['Part No'] || row['Product Code'] || '';
                const nameVal = row['Name'] || row['Product Name'] || row['Title'] || row['Item'] || row['Item Name'] || row['Description'] || row['Product'] || '';
                const unitVal = row['Unit'] || row['UOM'] || row['Unit of Measure'] || 'EA';
                const exclVal = row['Excl VAT'] || row['Excl_VAT'] || row['Price_Excl'] || row['ExclVAT'] || row['Price Excl VAT'] || row['Cost'] || "0";
                const inclVal = row['Incl VAT'] || row['Incl_VAT'] || row['Price_Incl'] || row['InclVAT'] || row['Price Incl VAT'] || row['Price'] || row['Retail Price'] || "0";
                const stockVal = row['Stock_Optional'] || row['Stock'] || row['Stock Quantity'] || row['Qty'] || row['Quantity'] || 1;
                const catVal = row['Category_Optional'] || row['Category'] || row['Main Category'] || row['Group'] || 'Uncategorized';
                const subCatVal = row['SubCategory_Optional'] || row['SubCategory'] || row['Sub Category'] || row['Subcategory'] || '';

                const cleanExcl = exclVal.toString().replace(/[^0-9.]/g, '');
                const cleanIncl = inclVal.toString().replace(/[^0-9.]/g, '');

                const priceExclCents = Math.round(parseFloat(cleanExcl || 0) * 100);
                const priceInclCents = Math.round(parseFloat(cleanIncl || 0) * 100);

                if (isNaN(priceInclCents)) throw new Error(`Row ${index + 1}: Invalid price format '${inclVal}'`);

                const rawColors = row['Colors_Optional'] || row['Colors'] || row['Color'] || '';
                const rawSizes = row['Sizes_Optional'] || row['Sizes'] || row['Size'] || '';
                const rawUrl = row['Image_URL_Optional'] || row['Image_URL'] || row['Image'] || row['Photo'] || row['Picture'] || row['Image URL'] || row['Photo URL'] || row['Picture URL'] || row['Img'] || null;

                const colorsArray = rawColors.split(';').map(c => c.trim()).filter(Boolean);
                const sizesArray = rawSizes.split(';').map(s => s.trim()).filter(Boolean);

                const matchedPhotoUrl = findMatchingPhotoUrl(resolvedImageUrls, itemNoVal, nameVal, rawUrl, index);

                return {
                    shop_id: shopId,
                    item_no: itemNoVal ? itemNoVal.toString().replace(/^["']|["']$/g, '').trim() : '',
                    title: nameVal ? nameVal.toString().replace(/^["']|["']$/g, '').trim() : 'Untitled Product',
                    unit: unitVal ? unitVal.toString().trim() : 'EA',
                    category: catVal ? catVal.toString().trim() : 'Uncategorized',
                    sub_category: subCatVal ? subCatVal.toString().trim() : '',
                    colors: colorsArray,
                    sizes: sizesArray,
                    condition: 'New',
                    description: '',
                    price_excl_vat_cents: isNaN(priceExclCents) ? 0 : priceExclCents,
                    price_incl_vat_cents: priceInclCents,
                    price_cents: priceInclCents,
                    stock_quantity: parseInt(stockVal, 10) || 1,
                    image_url: matchedPhotoUrl
                };
            });

            const batchSize = 50;
            for (let i = 0; i < batch.length; i += batchSize) {
                const chunk = batch.slice(i, i + batchSize);
                const { error } = await supabase.from('products').insert(chunk);
                if (error) throw error;
            }

            const withPhotosCount = batch.filter(p => p.image_url).length;
            const msg = `✓ Successfully imported ${batch.length} products (${withPhotosCount} with matched photos) into your ZimMarket inventory!`;
            
            setSuccessMsg(msg);
            setParsedData([]);
            setBulkImagesMap({});
            setUploadProgressMsg('');

            if (onUploadSuccess) {
                setTimeout(() => {
                    onUploadSuccess();
                }, 1200);
            }

        } catch (err) {
            setErrorMsg(`Import failed: ${err.message}`);
            setUploadProgressMsg('');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>Bulk CSV Import (B2B)</h3>
                <button onClick={downloadTemplate} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                    📥 Download Template
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed var(--accent-primary)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>1. Select CSV Spreadsheet</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>`.csv` inventory file</div>
                    <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <div className="btn-primary" style={{ padding: '6px 16px', fontSize: '13px' }}>
                        {parsedData.length > 0 ? `✓ Loaded (${parsedData.length} rows)` : 'Choose CSV File'}
                    </div>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed var(--success)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>2. Batch Product Photos (Optional)</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>Name files by SKU (e.g. `ELEC-001.jpg`)</div>
                    <input type="file" accept="image/*" multiple onChange={handleBulkImagesSelect} style={{ display: 'none' }} />
                    <div className="btn-secondary" style={{ padding: '6px 16px', fontSize: '13px', borderColor: 'var(--success)', color: 'var(--success)' }}>
                        {Object.keys(bulkImagesMap).length > 0 ? `✓ ${Object.keys(bulkImagesMap).length} Photos Loaded` : '📷 Select Image Files'}
                    </div>
                </label>
            </div>

            {successMsg && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: '600' }}>
                    {successMsg}
                </div>
            )}

            {uploadProgressMsg && (
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⌛</span> {uploadProgressMsg}
                </div>
            )}

            {errorMsg && (
                <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
                    {errorMsg}
                </div>
            )}

            {parsedData.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Found <strong>{parsedData.length}</strong> products ready to import.
                        </div>
                        <button onClick={handleBulkSubmit} className="btn-primary" disabled={uploading}>
                            {uploading ? '⌛ Processing Import...' : `🚀 Import All ${parsedData.length} Products`}
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '8px 12px' }}>Item No</th>
                                    <th style={{ padding: '8px 12px' }}>Name</th>
                                    <th style={{ padding: '8px 12px' }}>Unit</th>
                                    <th style={{ padding: '8px 12px' }}>Excl VAT</th>
                                    <th style={{ padding: '8px 12px' }}>Incl VAT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.slice(0, 5).map((row, idx) => (
                                    <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{row['Item No']}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{row['Name']}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{row['Unit']}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>${row['Excl VAT']}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--success)', fontWeight: 'bold' }}>${row['Incl VAT']}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {parsedData.length > 5 && (
                            <div style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', borderTop: '1px solid var(--border)' }}>
                                + {parsedData.length - 5} more rows...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
