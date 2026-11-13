import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, insert } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validations/auth';
import { sendEmail, generateActivationEmailHTML, generateActivationEmailText } from '@/lib/email';
import { sendSMS, generateActivationSMSMessage } from '@/lib/sms';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.issues?.[0]?.message || 'Dữ liệu không hợp lệ';
      return NextResponse.json(
        {
          success: false,
          message: errorMsg,
        },
        { status: 400 }
      );
    }

    const { registerMethod, email, phone, contact, password, username, full_name } = validation.data;
    const rawContact = (contact || email || phone || '').trim();

    // Auto-detect method: if it contains '@' it's email, otherwise it's phone
    const method = registerMethod || (rawContact.includes('@') ? 'email' : 'phone');

    let finalEmail = '';
    let finalPhone: string | null = null;

    if (method === 'email') {
      finalEmail = rawContact.toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
        return NextResponse.json(
          { success: false, message: 'Định dạng email không hợp lệ (VD: user@example.com)' },
          { status: 400 }
        );
      }

      const existingEmail = await queryOneBuilder<{ id: string }>('users', {
        select: 'id',
        filters: { email: finalEmail },
      });

      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Email này đã được sử dụng' },
          { status: 409 }
        );
      }
    } else {
      finalPhone = rawContact;

      // Validate phone format: 10 digits starting with 03, 05, 07, 08, 09 or +84
      if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(finalPhone)) {
        return NextResponse.json(
          { success: false, message: 'Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)' },
          { status: 400 }
        );
      }

      // Check if phone already exists
      const existingPhone = await queryOneBuilder<{ id: string }>('users', {
        select: 'id',
        filters: { phone: finalPhone },
      });

      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: 'Số điện thoại này đã được sử dụng' },
          { status: 409 }
        );
      }

      // Generate synthetic email to satisfy PostgreSQL NOT NULL constraint
      const cleanDigits = finalPhone.replace(/[^0-9]/g, '');
      finalEmail = `${cleanDigits}@phone.nikalearn.edu.vn`;
    }

    // Check if username already exists
    const existingUsername = await queryOneBuilder<{ id: string }>('users', {
      select: 'id',
      filters: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tên đăng nhập đã được sử dụng',
        },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);
    const newUserId = crypto.randomUUID();

    const [newUser] = await insert<{
      id: string;
      email: string;
      phone: string | null;
      password_hash: string;
      username: string;
      full_name: string;
      role: string;
      avatar_url: string | null;
      bio: string | null;
      membership_type: string;
      learning_streak: number;
      total_study_time: number;
      failed_login_attempts: number;
      is_verified: boolean;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>('users', {
      id: newUserId,
      email: finalEmail,
      phone: finalPhone,
      password_hash,
      username,
      full_name,
      role: 'STUDENT',
      membership_type: 'FREE',
      learning_streak: 0,
      total_study_time: 0,
      failed_login_attempts: 0,
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (!newUser) {
      throw new Error('Không thể khởi tạo tài khoản');
    }

    // Generate 16 recovery keys
    const recoveryKeys: string[] = [];
    const recoveryKeyHashes: Array<{ key: string; hash: string }> = [];

    for (let i = 0; i < 16; i++) {
      const key = crypto.randomBytes(8).toString('hex').toUpperCase();
      const hash = crypto
        .createHash('sha256')
        .update(key + (process.env.JWT_SECRET || 'fallback-secret'))
        .digest('hex');

      recoveryKeys.push(key);
      recoveryKeyHashes.push({ key, hash });
    }

    // Save recovery keys into user_metadata
    try {
      const recoveryKeysMetaValue = JSON.stringify({
        keys: recoveryKeyHashes.map(({ hash }) => ({
          hash,
          createdAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
      });

      await insert('user_metadata', {
        id: crypto.randomUUID(),
        user_id: newUser.id,
        meta_key: 'recovery_keys',
        meta_value: recoveryKeysMetaValue,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (metaErr) {
      console.warn('Warning: Could not save recovery_keys to user_metadata:', metaErr);
    }

    // Generate 6-digit Activation OTP
    const activationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto
      .createHash('sha256')
      .update(activationOtp + (process.env.JWT_SECRET || 'fallback-secret'))
      .digest('hex');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Save activation OTP to user_metadata
    try {
      await insert('user_metadata', {
        id: crypto.randomUUID(),
        user_id: newUser.id,
        meta_key: 'account_activation_otp',
        meta_value: JSON.stringify({
          hash: otpHash,
          expiresAt,
          method,
          target: method === 'email' ? finalEmail : finalPhone,
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (otpErr) {
      console.warn('Warning: Could not save activation OTP:', otpErr);
    }

    // Send OTP via Email or SMS
    try {
      if (method === 'email') {
        await sendEmail({
          to: finalEmail,
          subject: 'Mã xác thực kích hoạt tài khoản NikaLearn',
          html: generateActivationEmailHTML(activationOtp, full_name),
          text: generateActivationEmailText(activationOtp, full_name),
        });
      } else if (finalPhone) {
        await sendSMS({
          to: finalPhone,
          message: generateActivationSMSMessage(activationOtp),
        });
      }
    } catch (sendErr) {
      console.warn('Warning: Could not dispatch activation message (console fallback active):', sendErr);
    }

    // Always log prominent OTP in local dev console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`🔑 [DEV MODE] Mã OTP kích hoạt cho ${finalPhone || finalEmail}: ${activationOtp}`);
      console.log(`======================================================\n`);
    }

    return NextResponse.json(
      {
        success: true,
        needVerification: true,
        message: 'Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt tài khoản.',
        data: {
          userId: newUser.id,
          method,
          target: method === 'email' ? finalEmail : finalPhone,
          username: newUser.username,
          full_name: newUser.full_name,
          recoveryKeys,
          devOtp: process.env.NODE_ENV !== 'production' ? activationOtp : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Register error:', error);

    if (error?.code === '23505' || error?.message?.includes('duplicate')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email, số điện thoại hoặc tên đăng nhập đã được sử dụng',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message ? `Đăng ký thất bại: ${error.message}` : 'Đã xảy ra lỗi khi đăng ký',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
