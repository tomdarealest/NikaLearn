import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Lấy thông tin từ file .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Bắt buộc dùng SERVICE_ROLE_KEY để có quyền ghi thẳng vào Storage mà không bị RLS chặn
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Thiếu biến môi trường trong .env.local!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BUCKET_NAME = 'toeic-media_1';
const AUDIO_DIR = './downloaded_audios';

async function uploadAllAudios() {
    const files = fs.readdirSync(AUDIO_DIR).filter(file => file.endsWith('.mp3'));
    console.log(`🚀 Bắt đầu upload ${files.length} file audio lên bucket '${BUCKET_NAME}'...`);

    // Map lưu kết quả: { "1_audio": "https://...", "32-34_audio": "https://..." }
    const uploadedUrls = {};

    for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        const filePath = path.join(AUDIO_DIR, fileName);
        const fileBuffer = fs.readFileSync(filePath);

        // Đường dẫn lưu trên Supabase Storage
        const storagePath = `audios/${fileName}`;

        // 1. Upload file lên Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileBuffer, {
                contentType: 'audio/mpeg',
                upsert: true // Nếu file đã tồn tại thì ghi đè
            });

        if (uploadError) {
            console.error(`[${i + 1}/${files.length}] ✗ Lỗi upload ${fileName}:`, uploadError.message);
            continue;
        }

        // 2. Lấy link Public CDN vĩnh viễn
        const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        uploadedUrls[fileName] = publicData.publicUrl;
        console.log(`[${i + 1}/${files.length}] ✓ Đã upload: ${fileName}`);
    }

    // 3. Lưu lại danh sách URL mới vào file json để dùng cho bước seed database
    fs.writeFileSync('./supabase_audio_urls.json', JSON.stringify(uploadedUrls, null, 2));
    console.log('🎉 Upload hoàn tất! Toàn bộ URL đã được lưu vào file: supabase_audio_urls.json');
}

uploadAllAudios();