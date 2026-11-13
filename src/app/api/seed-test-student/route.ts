import { NextResponse } from 'next/server';
import { queryOneBuilder, insert, update } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const testEmail = 'hocvien.test@nikalearn.edu.vn';
    const testUsername = 'hocvien_toeic';
    const rawPassword = 'Password123@';

    // 1. Check if user already exists
    const existing = await queryOneBuilder<any>('users', {
      select: '*',
      filters: { email: testEmail },
    });

    const password_hash = await hashPassword(rawPassword);

    let userId = existing?.id;

    if (!existing) {
      // Find a sample user in users table to copy default schema structure
      const sampleUser = await queryOneBuilder<any>('users', {
        select: '*',
      });

      userId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Build payload ensuring all required schema columns have default values
      const userPayload: Record<string, any> = {
        id: userId,
        email: testEmail,
        password_hash,
        username: testUsername,
        full_name: 'Nguyễn Văn Học Viên',
        role: 'STUDENT',
        membership_type: 'PRO',
        is_active: true,
        is_verified: true,
        learning_streak: 5,
        total_study_time: 180,
        failed_login_attempts: 0,
        locked_until: null,
        last_login: null,
        created_at: now,
        updated_at: now,
      };

      // If sample user exists, copy default values for any missing columns
      if (sampleUser) {
        for (const key of Object.keys(sampleUser)) {
          if (userPayload[key] === undefined) {
            userPayload[key] = typeof sampleUser[key] === 'number' ? 0 : null;
          }
        }
        // Ensure critical fields aren't overwritten
        userPayload.id = userId;
        userPayload.email = testEmail;
        userPayload.password_hash = password_hash;
        userPayload.username = testUsername;
        userPayload.full_name = 'Nguyễn Văn Học Viên';
        userPayload.role = 'STUDENT';
        userPayload.membership_type = 'PRO';
        userPayload.is_active = true;
        userPayload.is_verified = true;
        userPayload.failed_login_attempts = 0;
        userPayload.created_at = now;
        userPayload.updated_at = now;
      }

      const [created] = await insert<{ id: string }>('users', userPayload);
    } else {
      // Update password and role
      await update('users', { id: userId }, {
        password_hash,
        role: 'STUDENT',
        is_active: true,
        is_verified: true,
        failed_login_attempts: 0,
        locked_until: null,
        full_name: 'Nguyễn Văn Học Viên',
        updated_at: new Date().toISOString(),
      });
    }

    // 2. Set default student academic and target score in user_metadata
    const metadataItems = [
      { key: 'student_university', value: 'Đại học Công nghệ TP.HCM (HUTECH)' },
      { key: 'student_major', value: 'Công nghệ thông tin' },
      { key: 'student_target_score', value: '785' },
      { key: 'student_target_deadline', value: '2026-12-30' },
    ];

    for (const item of metadataItems) {
      const metaExisting = await queryOneBuilder<{ id: string }>('user_metadata', {
        select: 'id',
        filters: { user_id: userId, meta_key: item.key },
      });

      if (metaExisting) {
        await update('user_metadata', { id: metaExisting.id }, {
          meta_value: item.value,
          updated_at: new Date().toISOString(),
        });
      } else {
        await insert('user_metadata', {
          id: crypto.randomUUID(),
          user_id: userId,
          meta_key: item.key,
          meta_value: item.value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tài khoản học viên test đã sẵn sàng!',
      account: {
        email: testEmail,
        username: testUsername,
        password: rawPassword,
        full_name: 'Nguyễn Văn Học Viên',
        university: 'Đại học Công nghệ TP.HCM (HUTECH)',
        major: 'Công nghệ thông tin',
        target_score: '785',
        target_deadline: '2026-12-30',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi tạo tài khoản test', error: error.message },
      { status: 500 }
    );
  }
}
