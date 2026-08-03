// client/src/components/BulkProductUpload.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from './supabaseClient.js';

export function BulkProductUpload({ shopId, onUploadSuccess }) {
    const [parsedData, setParsedData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

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

        try {
            const batch = parsedData.map((row, index) => {
                // Parse VAT prices. Replace commas if any.
                const cleanExcl = (row['Excl VAT'] || "0").toString().replace(',', '');
                const cleanIncl = (row['Incl VAT'] || "0").toString().replace(',', '');

                const priceExclCents = Math.round(parseFloat(cleanExcl) * 100);
                const priceInclCents = Math.round(parseFloat(cleanIncl) * 100);

                if (isNaN(priceInclCents)) throw new Error(`Row ${index + 1}: Invalid Incl VAT format '${row['Incl VAT']}'`);

                const rawColors = row['Colors_Optional'] || '';
                const rawSizes = row['Sizes_Optional'] || '';

                const colorsArray = rawColors.split(';').map(c => c.trim()).filter(Boolean);
                const sizesArray = rawSizes.split(';').map(s => s.trim()).filter(Boolean);

                return {
                    shop_id: shopId,
                    item_no: row['Item No'] || '',
                    title: row['Name'] || 'Untitled Product',
                    unit: row['Unit'] || 'EA',
                    category: row['Category_Optional'] || 'Uncategorized',
                    sub_category: row['SubCategory_Optional'] || '',
                    colors: colorsArray,
                    sizes: sizesArray,
                    condition: 'New', // Default for wholesale
                    description: '', // Optional/hidden in CSV
                    price_excl_vat_cents: isNaN(priceExclCents) ? 0 : priceExclCents,
                    price_incl_vat_cents: priceInclCents,
                    price_cents: priceInclCents, // Map to final cart price
                    stock_quantity: parseInt(row['Stock_Optional'], 10) || 1,
                    image_url: row['Image_URL_Optional'] || null
                };
            });

            const batchSize = 500;
            for (let i = 0; i < batch.length; i += batchSize) {
                const chunk = batch.slice(i, i + batchSize);
                const { error } = await supabase.from('products').insert(chunk);
                if (error) throw error;
            }

            alert(`Successfully imported ${batch.length} products!`);
            setParsedData([]);
            if (onUploadSuccess) onUploadSuccess();

        } catch (err) {
            setErrorMsg(`Import failed: ${err.message}`);
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

            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', padding: '24px', border: '2px dashed var(--border)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Drag & Drop CSV File Here or Click to Browse</div>
                    <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <div className="btn-primary" style={{ display: 'inline-block', padding: '6px 16px' }}>Select File</div>
                </label>
            </div>

            {errorMsg && (
                <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
                    {errorMsg}
                </div>
            )}

            {parsedData.length > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Found <strong>{parsedData.length}</strong> products ready to import.
                        </div>
                        <button onClick={handleBulkSubmit} className="btn-primary" disabled={uploading}>
                            {uploading ? 'Importing...' : `🚀 Import All ${parsedData.length} Products`}
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
