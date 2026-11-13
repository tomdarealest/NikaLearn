import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'toeic-media_1';

async function seedFinalData() {
    console.log("🚀 Đang nạp bộ đề 200 câu chuẩn vào Supabase...");

    // Đọc file JSON đã chuẩn hóa
    const jsonFile = fs.existsSync('./toeic_200_fixed_3_2.json')
        ? './toeic_200_fixed_3_2.json'
        : './toeic_200_fixed_3.json';

    const questions = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    const difficulties = ['easy', 'medium', 'hard'];

    // 1. Tạo bản ghi bài thi trong bảng 'tests'
    const { data: testRecord, error: testErr } = await supabase
        .from('tests')
        .insert({
            title: 'TOEIC Official Practice Test 01 (200 câu / 120 phút)',
            duration_minutes: 120,
            total_questions: 200
        })
        .select()
        .single();

    if (testErr) {
        console.error("❌ Lỗi tạo bài thi:", testErr.message);
        return;
    }

    const testId = testRecord.id;
    console.log(`✓ Đã tạo bài thi ID: ${testId}`);

    // 2. Chuẩn hóa dữ liệu theo schema database
    const rows = questions.map((q) => {
        let supabaseAudioUrl = null;
        if (q.audio) {
            const fileName = q.audio.split('/').pop().split('?')[0];
            const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`audios/${fileName}`);
            supabaseAudioUrl = data.publicUrl;
        }

        return {
            test_id: testId,
            question_number: q.question_number,
            part_number: q.part,
            question_text: q.question_text || "",
            image_url: q.image || null,
            audio_url: supabaseAudioUrl,
            options: q.choices || {},
            correct_option: q.correct_answer,
            difficulty: difficulties[q.question_number % 3],
            transcript: q.transcript || null,      // Đưa transcript vào cột riêng
            explanation: q.explanation || ""      // Explanation chỉ chứa lời giải & dịch nghĩa
        };
    });

    // 3. Batch insert từng cụm 50 câu
    for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error: insErr } = await supabase.from('questions').insert(chunk);
        if (insErr) {
            console.error(`❌ Lỗi chèn câu ${i + 1} - ${i + chunk.length}:`, insErr.message);
            return;
        }
    }

    console.log(`🎉 Xong! Toàn bộ 200 câu kèm Audio Supabase Storage đã nạp thành công vào Database.`);
}

seedFinalData();