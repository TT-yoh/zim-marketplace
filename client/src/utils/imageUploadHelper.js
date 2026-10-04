// client/src/utils/imageUploadHelper.js
import { supabase } from '../components/supabaseClient.js';

/**
 * Resizes and compresses an image file on an HTML5 canvas before storage.
 * Converts large 5MB-15MB camera/phone photos to ultra-compact WebP/JPEG (~35KB-70KB)
 * for lightning-fast uploads, minimal Supabase storage usage, and 0ms web storefront rendering.
 * 
 * @param {File} file - Raw image file from input or dropzone
 * @param {number} maxWidth - Maximum width bound (default 1000px)
 * @param {number} maxHeight - Maximum height bound (default 1000px)
 * @param {number} quality - Compression quality 0.0 - 1.0 (default 0.80)
 * @returns {Promise<File>} Compressed File object
 */
export async function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.80) {
    return new Promise((resolve) => {
        // If it's not a standard raster image (e.g. PDF document, vector SVG), return as-is
        if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down keeping pristine aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, width);
                canvas.height = Math.max(1, height);

                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) {
                    resolve(file);
                    return;
                }

                // High-fidelity image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Fill clean white background (prevents transparent PNGs turning black when converted to JPEG/WebP)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Detect WebP support in canvas, fallback to JPEG
                const canUseWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
                const outputMime = canUseWebP ? 'image/webp' : 'image/jpeg';
                const outputExt = canUseWebP ? '.webp' : '.jpg';
                const baseName = (file.name || 'product_photo').replace(/\.[^/.]+$/, '');

                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size > 0) {
                            const compressedFile = new File(
                                [blob],
                                `${baseName}${outputExt}`,
                                { type: outputMime, lastModified: Date.now() }
                            );
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    outputMime,
                    quality
                );
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

/**
 * Compresses an image client-side and uploads it directly to Supabase Storage bucket.
 * @param {File} file - The file to upload
 * @param {string} bucketName - Supabase storage bucket name ('product-images' or 'kyc-documents')
 * @param {string} folderPath - Path prefix (e.g., 'shop_id')
 * @returns {Promise<string>} Permanent Public CDN URL
 */
export async function uploadImageToStorage(file, bucketName = 'product-images', folderPath = '') {
    if (!file) return null;

    // If already a valid public or signed URL, return as-is
    if (typeof file === 'string') {
        if (file.startsWith('http://') || file.startsWith('https://')) {
            return file;
        }
        return null;
    }

    try {
        // 1. High-efficiency client-side compression (reduces 5-15MB down to ~35KB-65KB WebP)
        const fileToUpload = await compressImage(file, 1000, 1000, 0.80);

        // 2. Generate clean, collision-free storage path
        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'webp';
        const cleanExt = ['webp', 'jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(fileExt.toLowerCase()) ? fileExt.toLowerCase() : 'webp';
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const cleanFolder = folderPath ? folderPath.toString().replace(/^\/+|\/+$/g, '') : '';
        const filePath = cleanFolder ? `${cleanFolder}/${uniqueId}.${cleanExt}` : `${uniqueId}.${cleanExt}`;

        // 3. Upload compressed binary to Supabase Storage bucket with retry
        const mimeType = fileToUpload.type || (cleanExt === 'webp' ? 'image/webp' : 'image/jpeg');

        let uploadResult = await supabase.storage
            .from(bucketName)
            .upload(filePath, fileToUpload, {
                contentType: mimeType,
                cacheControl: '31536000, public', // 1-year browser/CDN caching for blazing-fast page loads
                upsert: false
            });

        // 1-retry on network transient error
        if (uploadResult.error) {
            console.warn(`Initial storage upload failed for '${filePath}':`, uploadResult.error.message, 'Retrying...');
            await new Promise(r => setTimeout(r, 400));
            uploadResult = await supabase.storage
                .from(bucketName)
                .upload(filePath, fileToUpload, {
                    contentType: mimeType,
                    cacheControl: '31536000, public',
                    upsert: false
                });
        }

        if (!uploadResult.error) {
            if (bucketName === 'kyc-documents') {
                // For private KYC documents, generate a signed URL (1 hour validity)
                const { data: signedUrlData } = await supabase.storage
                    .from(bucketName)
                    .createSignedUrl(filePath, 3600);

                if (signedUrlData && signedUrlData.signedUrl) {
                    return signedUrlData.signedUrl;
                }
            }

            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            if (publicUrlData && publicUrlData.publicUrl) {
                return publicUrlData.publicUrl;
            }
        } else {
            console.error(`Supabase storage upload error for bucket '${bucketName}':`, uploadResult.error.message);
            return null;
        }

        return null;
    } catch (err) {
        console.error('Image upload helper exception:', err);
        return null;
    }
}

/**
 * Extracts the storage object path from a Supabase URL or relative path
 * and returns a secure, time-limited signed URL for viewing private files.
 * @param {string} bucketName - 'kyc-documents'
 * @param {string} pathOrUrl - Full URL or relative path
 * @param {number} expiresInSeconds - Expiration time (default 1 hour)
 * @returns {Promise<string>} Signed URL or original input
 */
export async function getSecureDocumentUrl(bucketName, pathOrUrl, expiresInSeconds = 3600) {
    if (!pathOrUrl) return null;
    
    // Base64 data URLs don't need signing
    if (pathOrUrl.startsWith('data:')) {
        return pathOrUrl;
    }

    try {
        let objectPath = pathOrUrl;

        // If it's a full Supabase URL, extract the path after the bucket name
        const bucketToken = `/${bucketName}/`;
        const bucketIndex = pathOrUrl.indexOf(bucketToken);
        if (bucketIndex !== -1) {
            objectPath = pathOrUrl.substring(bucketIndex + bucketToken.length).split('?')[0];
        }

        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(decodeURIComponent(objectPath), expiresInSeconds);

        if (error || !data?.signedUrl) {
            console.warn(`Could not create signed URL for ${objectPath}:`, error?.message);
            return pathOrUrl;
        }

        return data.signedUrl;
    } catch (err) {
        console.error('Failed generating signed URL:', err);
        return pathOrUrl;
    }
}

