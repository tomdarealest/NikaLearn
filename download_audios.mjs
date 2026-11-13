import fs from 'fs';
import path from 'path';
import https from 'https';

const JSON_FILE = 'test2.json';
const OUTPUT_DIR = './audios_test2';

// Tạo thư mục chứa audio nếu chưa có
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Đọc dữ liệu từ file test2.json
const rawData = fs.readFileSync(JSON_FILE, 'utf-8');
const questions = JSON.parse(rawData);

// Lọc các link audio hợp lệ và không trùng lặp
const audioMap = new Map();
for (const q of questions) {
    if (q.audio && typeof q.audio === 'string' && q.audio.startsWith('http')) {
        const url = q.audio;
        const filename = path.basename(new URL(url).pathname);
        if (!audioMap.has(filename)) {
            audioMap.set(filename, url);
        }
    }
}

console.log(`🔍 Tìm thấy ${audioMap.size} file MP3 cần tải về.`);

// Hàm tải 1 file
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest)) {
            console.log(`⏩ Đã có sẵn: ${path.basename(dest)}`);
            return resolve();
        }

        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        console.log(`✅ Đã tải: ${path.basename(dest)}`);
                        resolve();
                    });
                });
            } else {
                file.close();
                fs.unlinkSync(dest);
                reject(new Error(`Lỗi tải (${response.statusCode}): ${url}`));
            }
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            reject(err);
        });
    });
};

// Tải tuần tự các file để tránh nghẽn mạng
(async () => {
    let count = 0;
    for (const [filename, url] of audioMap.entries()) {
        count++;
        const dest = path.join(OUTPUT_DIR, filename);
        process.stdout.write(`[${count}/${audioMap.size}] `);
        try {
            await downloadFile(url, dest);
        } catch (err) {
            console.error(`❌ Thất bại: ${filename} - ${err.message}`);
        }
    }
    console.log(`\n🎉 Hoàn thành tải toàn bộ MP3 vào thư mục: ${OUTPUT_DIR}`);
})();