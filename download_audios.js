import fs from 'fs';
import path from 'path';
import https from 'https';

// 1. Đọc file danh sách link audio vừa xuất
const rawLinks = fs.readFileSync('./audio_links.json', 'utf-8');
const audioUrls = JSON.parse(rawLinks);

// 2. Tạo thư mục lưu nếu chưa có
const outputDir = './downloaded_audios';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Hàm tải file từ link CDN
function downloadAudio(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            // Xử lý nếu link bị chuyển hướng (Redirect 301, 302)
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadAudio(response.headers.location, dest).then(resolve).catch(reject);
            }

            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            } else {
                file.close();
                fs.unlink(dest, () => { });
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

// 3. Tiến hành tải tuần tự từng file
async function run() {
    console.log(`🚀 Bắt đầu tải ${audioUrls.length} file audio...`);

    for (let i = 0; i < audioUrls.length; i++) {
        const url = audioUrls[i];

        // Tự động lấy tên file gốc từ URL (ví dụ: 10_audio.ce03e515.mp3)
        let fileName = url.split('/').pop().split('?')[0];
        if (!fileName.endsWith('.mp3')) fileName = `audio_${i + 1}.mp3`;

        const destPath = path.join(outputDir, fileName);

        try {
            await downloadAudio(url, destPath);
            console.log(`[${i + 1}/${audioUrls.length}] ✓ Đã tải: ${fileName}`);
        } catch (err) {
            console.error(`[${i + 1}/${audioUrls.length}] ✗ Lỗi tải file ${fileName}:`, err.message);
        }
    }

    console.log('🎉 Hoàn tất! Tất cả file MP3 đã nằm trong thư mục: /downloaded_audios');
}

run();