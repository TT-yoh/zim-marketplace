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

const findMatchingPhotoUrl = (resolvedUrlsMap, itemNo, name, rawUrl) => {
    if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
        return rawUrl;
    }

    const normItemNo = normalizeKey(itemNo);
    const normName = normalizeKey(name);

    // 1. Direct SKU match
    if (normItemNo && resolvedUrlsMap[normItemNo]) {
        return resolvedUrlsMap[normItemNo];
    }

    // 2. Direct Name match
    if (normName && resolvedUrlsMap[normName]) {
        return resolvedUrlsMap[normName];
    }

    // 3. Substring / Partial Name match
    if (normName && normName.length >= 3) {
        for (const [key, url] of Object.entries(resolvedUrlsMap)) {
            if (key.includes(normName) || normName.includes(key)) {
                return url;
            }
        }
    }

    // 4. Substring / Partial SKU match
    if (normItemNo && normItemNo.length >= 3) {
        for (const [key, url] of Object.entries(resolvedUrlsMap)) {
            if (key.includes(normItemNo) || normItemNo.includes(key)) {
                return url;
            }
        }
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
            complete: (results) => {
                if (results.errors.length > 0) {
                    setErrorMsg("Error parsing CSV. Please check formatting.");
                    return;
                }
                
                // Validate headers loosely
                const headers = results.meta.fields || [];
                if (!headers.includes('Name') || !headers.includes('Incl VAT')) {
                    setErrorMsg("Missing required columns: Name or Incl VAT");
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
            // 1. Build lookup keys from CSV spreadsheet rows
            const csvKeysSet = new Set();
            parsedData.forEach(row => {
                const itemNoVal = row['Item No'] || row['Item_No'] || row['SKU'] || row['ItemNo'] || row['Code'] || '';
                const nameVal = row['Name'] || row['Product Name'] || row['Title'] || '';
                
                const normItemNo = normalizeKey(itemNoVal);
                const normName = normalizeKey(nameVal);
                if (normItemNo) csvKeysSet.add(normItemNo);
                if (normName) csvKeysSet.add(normName);
            });

            // 2. Identify ALL photos that match items in the CSV spreadsheet (by SKU or Product Name)
            const photoKeys = Object.keys(bulkImagesMap);
            const matchedPhotoKeys = photoKeys.filter(imgKey => {
                // Direct match in csvKeysSet
                if (csvKeysSet.has(imgKey)) return true;
                // Substring match
                for (const csvKey of csvKeysSet) {
                    if (csvKey.length >= 3 && (imgKey.includes(csvKey) || csvKey.includes(imgKey))) {
                        return true;
                    }
                }
                return false;
            });

            const totalMatched = matchedPhotoKeys.length;
            const resolvedImageUrls = {};

            // 3. Upload matched photos with live progress feedback
            for (let i = 0; i < totalMatched; i++) {
                const key = matchedPhotoKeys[i];
                const file = bulkImagesMap[key];
                setUploadProgressMsg(`Uploading matched photo ${i + 1} of ${totalMatched}: ${file.name}...`);

                try {
                    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const fileName = `${shopId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${safeName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(fileName, file, { cacheControl: '3600', upsert: true });

                    if (!uploadError) {
                        const { data: publicUrlData } = supabase.storage
                            .from('product-images')
                            .getPublicUrl(fileName);
                        resolvedImageUrls[key] = publicUrlData.publicUrl;
                    } else {
                        // Fallback to Data URL if storage bucket fails
                        const dataUrl = await readFileAsDataUrl(file);
                        if (dataUrl) resolvedImageUrls[key] = dataUrl;
                    }
                } catch (err) {
                    const dataUrl = await readFileAsDataUrl(file);
                    if (dataUrl) resolvedImageUrls[key] = dataUrl;
                }
            }

            setUploadProgressMsg('Importing products into ZimMarket catalog...');

            const batch = parsedData.map((row, index) => {
                const itemNoVal = row['Item No'] || row['Item_No'] || row['SKU'] || row['ItemNo'] || row['Code'] || '';
                const nameVal = row['Name'] || row['Product Name'] || row['Title'] || row['Item'] || '';
                const exclVal = row['Excl VAT'] || row['Excl_VAT'] || row['Price_Excl'] || "0";
                const inclVal = row['Incl VAT'] || row['Incl_VAT'] || row['Price_Incl'] || row['Price'] || "0";

                const cleanExcl = exclVal.toString().replace(/[^0-9.]/g, '');
                const cleanIncl = inclVal.toString().replace(/[^0-9.]/g, '');

                const priceExclCents = Math.round(parseFloat(cleanExcl || 0) * 100);
                const priceInclCents = Math.round(parseFloat(cleanIncl || 0) * 100);

                if (isNaN(priceInclCents)) throw new Error(`Row ${index + 1}: Invalid price format '${inclVal}'`);

                const rawColors = row['Colors_Optional'] || row['Colors'] || '';
                const rawSizes = row['Sizes_Optional'] || row['Sizes'] || '';
                const rawUrl = row['Image_URL_Optional'] || row['Image_URL'] || row['Image'] || null;

                const colorsArray = rawColors.split(';').map(c => c.trim()).filter(Boolean);
                const sizesArray = rawSizes.split(';').map(s => s.trim()).filter(Boolean);

                const matchedPhotoUrl = findMatchingPhotoUrl(resolvedImageUrls, itemNoVal, nameVal, rawUrl);

                return {
                    shop_id: shopId,
                    item_no: itemNoVal ? itemNoVal.toString().replace(/^["']|["']$/g, '').trim() : '',
                    title: nameVal ? nameVal.toString().replace(/^["']|["']$/g, '').trim() : 'Untitled Product',
                    unit: row['Unit'] || 'EA',
                    category: row['Category_Optional'] || row['Category'] || 'Uncategorized',
                    sub_category: row['SubCategory_Optional'] || row['SubCategory'] || '',
                    colors: colorsArray,
                    sizes: sizesArray,
                    condition: 'New',
                    description: '',
                    price_excl_vat_cents: isNaN(priceExclCents) ? 0 : priceExclCents,
                    price_incl_vat_cents: priceInclCents,
                    price_cents: priceInclCents,
                    stock_quantity: parseInt(row['Stock_Optional'] || row['Stock'] || 1, 10) || 1,
                    image_url: matchedPhotoUrl
                };
            });

            const batchSize = 500;
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
