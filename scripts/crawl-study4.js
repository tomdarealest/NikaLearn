const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://study4.com/tests/6852/practice/?part=19042&part=19043&part=19044&part=19045&part=19046&part=19047&part=19048&time_limit=120&layout=';
const USER_DATA_DIR = path.resolve(__dirname, '../.study4_browser_profile');

// Hàm tạo câu lệnh cURL chuẩn từ Playwright Request
function convertRequestToCurl(request) {
    const method = request.method();
    const url = request.url();
    const headers = request.headers();
    const postData = request.postData();

    let curl = `curl --location '${url}' \\\n`;
    curl += `  --request ${method}`;

    for (const [key, val] of Object.entries(headers)) {
        if (key.startsWith(':')) continue;
        const escapedVal = val.replace(/'/g, "'\\''");
        curl += ` \\\n  --header '${key}: ${escapedVal}'`;
    }

    if (postData) {
        const escapedData = postData.replace(/'/g, "'\\''");
        curl += ` \\\n  --data '${escapedData}'`;
    }

    return curl;
}

async function main() {
    console.log('================================================================');
    console.log('🎯 STUDY4 PLAYWRIGHT CRAWLER & EXACT CURL GENERATOR');
    console.log('================================================================');
    console.log(`🔗 Target URL: ${TARGET_URL}`);
    console.log(`📁 Browser Profile: ${USER_DATA_DIR}\n`);

    const isHeadless = process.argv.includes('--headless');

    // Dùng Persistent Context để giữ session đăng nhập cho các lần chạy sau
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: isHeadless, // Mặc định mở giao diện để người dùng đăng nhập nếu chưa có phiên
        viewport: { width: 1400, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        args: ['--disable-blink-features=AutomationControlled']
    });

    // Hỗ trợ nạp cookie trực tiếp nếu người dùng truyền vào
    const cookieArg = process.env.STUDY4_COOKIE || process.argv.find(arg => arg.startsWith('--cookie='))?.replace('--cookie=', '');
    if (cookieArg) {
        const cookiePairs = cookieArg.split(';').map(c => c.trim()).filter(Boolean);
        const cookiesToSet = cookiePairs.map(pair => {
            const [name, ...val] = pair.split('=');
            return {
                name: name.trim(),
                value: val.join('=').trim(),
                domain: '.study4.com',
                path: '/'
            };
        });
        await context.addCookies(cookiesToSet);
        console.log(`🍪 Đã nạp ${cookiesToSet.length} cookie cấu hình.`);
    }

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    let capturedPracticeCurl = null;
    const capturedApiResponses = [];

    // Bắt và phân tích Network Requests để trích xuất cURL
    page.on('request', request => {
        const reqUrl = request.url();

        // 1. Bắt request chính của trang practice test
        if (reqUrl.includes('/practice/') && reqUrl.includes('part=')) {
            const curl = convertRequestToCurl(request);
            capturedPracticeCurl = curl;
            fs.writeFileSync('study4_practice_curl.sh', curl, 'utf-8');
            fs.writeFileSync('study4_curl.txt', curl, 'utf-8');
            console.log('\n✅ [Playwright] Đã bắt thành công Request chính!');
            console.log('📝 cURL đã được xuất vào: study4_practice_curl.sh & study4_curl.txt\n');
        }
    });

    // Bắt các response API chứa JSON
    page.on('response', async response => {
        try {
            const reqUrl = response.url();
            const contentType = response.headers()['content-type'] || '';
            if (reqUrl.includes('study4.com') && contentType.includes('application/json')) {
                const json = await response.json();
                capturedApiResponses.push({ url: reqUrl, data: json });
            }
        } catch (_) {}
    });

    console.log('🌐 Đang điều hướng đến trang bài thi Study4...');
    await page.goto(TARGET_URL, { waitUntil: 'load', timeout: 60000 }).catch(() => {});

    // Kiểm tra xem hiện tại có đang bị ở trang Đăng nhập không
    const checkIsLoginPage = () => {
        const u = page.url();
        return u.includes('/login') || !u.includes('/practice/');
    };

    if (checkIsLoginPage()) {
        console.log('\n================================================================');
        console.log('⚠️  CHÚ Ý: TRÌNH DUYỆT ĐANG Ở TRANG ĐĂNG NHẬP STUDY4!');
        console.log('👉 Vui lòng ĐĂNG NHẬP tài khoản trên cửa sổ Chrome vừa mở.');
        console.log('👉 Sau khi đăng nhập xong, nếu trang chưa tự chuyển về bài thi:');
        console.log('   Hãy bấm vào bài test hoặc dán link bài test vào thanh địa chỉ:');
        console.log(`   ${TARGET_URL}`);
        console.log('⏳ Script đang đợi bạn vào phòng thi...');
        console.log('================================================================\n');

        // Chờ người dùng đăng nhập và URL chuyển về trang practice
        await page.waitForURL(url => {
            const str = url.toString();
            return str.includes('/practice/') && !str.includes('/login');
        }, { timeout: 600000 }); // Chờ tối đa 10 phút

        console.log('🎉 Đã phát hiện trang bài thi! Đang chờ tải dữ liệu bài làm...');
    }

    // Đợi thêm cho DOM của bài test load hoàn toàn
    console.log('⏳ Đang đợi toàn bộ câu hỏi và audio render lên màn hình...');
    try {
        await page.waitForSelector('audio, .question-item, .test-item, .test-question-item, .context-wrapper, [class*="question"], [data-part]', { timeout: 30000 });
    } catch (_) {
        console.log('ℹ️ Tiếp tục phân tích DOM...');
    }

    // Chờ thêm 3s để các script của Study4 render xong audio player
    await page.waitForTimeout(3000);

    // Nếu chưa có cURL từ page.on('request') (do đã login từ trước hoặc cache), tạo cURL hoàn chỉnh kèm Cookie
    const cookies = await context.cookies(['https://study4.com']);
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const finalCurl = `curl --location '${page.url()}' \\\n` +
        `  --request GET \\\n` +
        `  --header 'Cookie: ${cookieHeader}' \\\n` +
        `  --header 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' \\\n` +
        `  --header 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8' \\\n` +
        `  --header 'Referer: https://study4.com/'`;

    fs.writeFileSync('study4_practice_curl.sh', finalCurl, 'utf-8');
    fs.writeFileSync('study4_curl.txt', finalCurl, 'utf-8');
    console.log('💾 File cURL chính xác nhất đã sẵn sàng: study4_practice_curl.sh & study4_curl.txt');

    // Lưu file HTML thô
    const fullHtml = await page.content();
    fs.writeFileSync('study4_raw_page.html', fullHtml, 'utf-8');
    console.log('💾 Đã lưu HTML thô trang thi vào: study4_raw_page.html');

    // Nếu có API JSON response, lưu lại
    if (capturedApiResponses.length > 0) {
        fs.writeFileSync('study4_api_responses.json', JSON.stringify(capturedApiResponses, null, 2), 'utf-8');
        console.log(`💾 Đã lưu ${capturedApiResponses.length} API response vào: study4_api_responses.json`);
    }

    // Trích xuất cấu trúc chi tiết bài thi từ DOM
    console.log('\n🔍 Bắt đầu bóc tách câu hỏi, đáp án, hình ảnh và audio...');
    const extractedData = await page.evaluate(() => {
        // 1. Quét biến toàn cục
        const globalVariables = {};
        for (const k of ['testData', 'TEST_DATA', 'context', '__NEXT_DATA__', 'test_data', 'examData', 'initialState']) {
            if (window[k]) {
                try { globalVariables[k] = window[k]; } catch (_) {}
            }
        }

        // 2. Quét tất cả audio link
        const audioUrls = new Set();
        document.querySelectorAll('audio, source, [data-audio], [data-src]').forEach(el => {
            const src = el.src || el.getAttribute('src') || el.getAttribute('data-audio') || el.getAttribute('data-src');
            if (src && (src.includes('.mp3') || src.includes('study4.com/media/'))) {
                audioUrls.add(src);
            }
        });

        // Quét regex link .mp3 trong toàn bộ HTML
        const allHtml = document.documentElement.innerHTML;
        const mp3Regex = /https:\/\/[^"'\s]+\.mp3/g;
        let match;
        while ((match = mp3Regex.exec(allHtml)) !== null) {
            audioUrls.add(match[0]);
        }

        // 3. Quét các Part nếu có tab/header
        const partsInfo = [];
        document.querySelectorAll('.part-nav, .nav-tabs li, [data-part]').forEach(p => {
            partsInfo.push(p.textContent.trim());
        });

        // 4. Quét từng nhóm câu hỏi / đoạn văn
        const questionGroups = [];
        const groupElements = document.querySelectorAll(
            '.context-wrapper, .question-group, .test-group, .reading-text, .passage-box'
        );

        groupElements.forEach((gEl, gIdx) => {
            const contextText = gEl.querySelector('.context-content, .passage-content, .text-content, p');
            const images = [];
            gEl.querySelectorAll('img').forEach(img => {
                if (img.src && !img.src.includes('logo') && !img.src.includes('icon') && !img.src.includes('avatar')) {
                    images.push(img.src);
                }
            });

            let groupAudio = null;
            const audioEl = gEl.querySelector('audio, source, [data-audio]');
            if (audioEl) {
                groupAudio = audioEl.src || audioEl.getAttribute('data-audio') || audioEl.getAttribute('src');
            }

            questionGroups.push({
                groupIdx: gIdx + 1,
                contextHtml: contextText ? contextText.innerHTML.trim() : '',
                contextText: contextText ? contextText.textContent.trim() : '',
                images,
                audio: groupAudio
            });
        });

        // 5. Quét từng câu hỏi
        const questions = [];
        const qElements = document.querySelectorAll(
            '.test-question-item, .question-item, .test-item, .question-wrapper, [data-question-id]'
        );

        qElements.forEach((qEl, index) => {
            // Số thứ tự câu
            const qNumEl = qEl.querySelector('.question-number, .q-number, .number, strong, b');
            const numberText = qNumEl ? qNumEl.textContent.trim().replace(/[^0-9]/g, '') : `${index + 1}`;

            // Nội dung câu hỏi
            const qTextEl = qEl.querySelector('.question-text, .q-text, .text, .content');
            let questionText = qTextEl ? qTextEl.textContent.trim() : '';

            // Danh sách lựa chọn A, B, C, D
            const choices = [];
            const choiceEls = qEl.querySelectorAll('.answer-item, .form-check, .choice-item, label');
            choiceEls.forEach(c => {
                const label = c.textContent.trim();
                const input = c.querySelector('input');
                const val = input ? input.value : null;
                choices.push({
                    text: label,
                    value: val
                });
            });

            // Ảnh của riêng câu hỏi
            const qImgs = [];
            qEl.querySelectorAll('img').forEach(img => {
                if (img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
                    qImgs.push(img.src);
                }
            });

            // Audio của riêng câu hỏi
            let qAudio = null;
            const qAudioEl = qEl.querySelector('audio, source, [data-audio]');
            if (qAudioEl) {
                qAudio = qAudioEl.src || qAudioEl.getAttribute('data-audio') || qAudioEl.getAttribute('src');
            }

            questions.push({
                index: index + 1,
                number: parseInt(numberText, 10) || (index + 1),
                text: questionText,
                choices,
                images: qImgs,
                audio: qAudio
            });
        });

        return {
            title: document.title,
            url: window.location.href,
            audioLinks: Array.from(audioUrls),
            parts: partsInfo,
            questionGroups,
            questionsCount: questions.length,
            questions,
            globalVariables
        };
    });

    // 6. Ghi các file kết quả
    if (extractedData.audioLinks.length > 0) {
        fs.writeFileSync('study4_audio_links.json', JSON.stringify(extractedData.audioLinks, null, 2), 'utf-8');
        console.log(`🎵 Đã tìm thấy ${extractedData.audioLinks.length} audio links -> study4_audio_links.json`);
    }

    fs.writeFileSync('study4_test_6852.json', JSON.stringify(extractedData, null, 2), 'utf-8');
    console.log(`📦 Đã lưu toàn bộ dữ liệu cấu trúc vào: study4_test_6852.json`);
    console.log(`📊 Tổng số câu hỏi bóc tách: ${extractedData.questionsCount}`);
    console.log(`📖 Tổng số nhóm/đoạn văn: ${extractedData.questionGroups.length}`);

    console.log('\n================================================================');
    console.log('🎉 CRAWL & TRÍCH XUẤT THÀNH CÔNG!');
    console.log('1. cURL chính xác: study4_practice_curl.sh & study4_curl.txt');
    console.log('2. File dữ liệu thi: study4_test_6852.json');
    console.log('3. Danh sách audio: study4_audio_links.json');
    console.log('4. File HTML gốc: study4_raw_page.html');
    console.log('================================================================\n');

    // Chờ 5s rồi đóng trình duyệt
    await page.waitForTimeout(5000);
    await context.close();
}

main().catch(err => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
});
