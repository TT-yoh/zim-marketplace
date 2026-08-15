// client/src/utils/imageUploadHelper.js
import { supabase } from '../components/supabaseClient.js';

/**
 * Resizes and compresses an image file on an HTML5 canvas.
 * Reduces 10MB+ raw camera photos to ~100-200KB JPEG for fast uploads and small storage footprint.
 */
export async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve) => {
        // If it's not an image (e.g. PDF document), return original file
        if (!file || !file.type || !file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

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
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File(
                                [blob],
                                file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                                { type: 'image/jpeg', lastModified: Date.now() }
                            );
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
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
 * Uploads an image to Supabase Storage with automatic compression and Base64 fallback.
 * @param {File} file - The file to upload
 * @param {string} bucketName - Supabase storage bucket name ('product-images' or 'kyc-documents')
 * @param {string} folderPath - Path prefix (e.g., 'shop_id/12345')
 * @returns {Promise<string>} Public URL or compressed Data URL
 */
export async function uploadImageToStorage(file, bucketName = 'product-images', folderPath = '') {
    if (!file) return null;

    try {
        // 1. Compress image before uploading
        const fileToUpload = await compressImage(file);

        // 2. Generate clean file path
        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'jpg';
        const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'].includes(fileExt.toLowerCase()) ? fileExt : 'jpg';
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const filePath = folderPath ? `${folderPath}/${uniqueId}.${cleanExt}` : `${uniqueId}.${cleanExt}`;

        // 3. Attempt upload to Supabase Storage
        const mimeType = fileToUpload.type || 'image/jpeg';
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, fileToUpload, {
                contentType: mimeType,
                cacheControl: '3600',
                upsert: true
            });

        if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            if (publicUrlData && publicUrlData.publicUrl) {
                return publicUrlData.publicUrl;
            }
        } else {
            console.warn(`Supabase storage upload error for bucket '${bucketName}':`, uploadError.message);
        }

        // 4. Resilient Fallback: Convert compressed file to Data URL
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(fileToUpload);
        });
    } catch (err) {
        console.error('Image upload helper exception:', err);

        // Final fallback attempt
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }
}
