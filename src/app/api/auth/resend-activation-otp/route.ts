import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, insert, update } from '@/lib/db';
import { sendEmail, generateActivationEmailHTML, generateActivationEmailText } from '@/lib/email';
import { sendSMS, generateActivationSMSMessage } from '@/lib/sms';
import crypto from 'crypto';

/**
 * POST /api/auth/resend-activation-otp
 * 
 * Gửi lại mã OTP kích hoạt tài khoản
 * Body:
 * - userId?: string
 * - email?: string
 * - phone?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, phone } = body;

    if (!userId && !email && !phone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng cung cấp email, số điện thoại hoặc mã tài khoản',
        },
        { status: 400 }
      );
    }

    // Find user
    let user: any = null;
    if (userId) {
      user = await queryOneBuilder<any>('users', {
        select: '*',
        filters: { id: userId },
      });
    } else if (email) {
      user = await queryOneBuilder<any>('users', {
        select: '*',
        filters: { email: email.toLowerCase().trim() },
      });
    } else if (phone) {
      user = await queryOneBuilder<any>('users', {
        select: '*',
        filters: { phone: phone.trim() },
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy tài khoản người dùng',
        },
        { status: 404 }
      );
    }

    if (user.is_verified) {
      return NextResponse.json(
        {
          success: true,
          alreadyVerified: true,
          message: 'Tài khoản của bạn đã được kích hoạt, bạn có thể đăng nhập ngay.',
        },
        { status: 200 }
      );
    }

    // Determine method (email or phone)
    const isSyntheticEmail = user.email && user.email.endsWith('@phone.nikalearn.edu.vn');
    const method = (!isSyntheticEmail && user.email) ? 'email' : 'phone';
    const target = method === 'email' ? user.email : user.phone;

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          message: 'Không tìm thấy phương thức liên hệ để gửi mã OTP',
        },
        { status: 400 }
      );
    }

    // Generate new 6-digit OTP
    const activationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto
      .createHash('sha256')
      .update(activationOtp + (process.env.JWT_SECRET || 'fallback-secret'))
      .digest('hex');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    const now = new Date().toISOString();

    // Check existing OTP to update or insert
    const existingOtpMeta = await queryOneBuilder<{ id: string }>('user_metadata', {
      select: 'id',
      filters: {
        user_id: user.id,
        meta_key: 'account_activation_otp',
      },
    });

    const metaValue = JSON.stringify({
      hash: otpHash,
      expiresAt,
      method,
      target,
    });

    if (existingOtpMeta) {
      await update('user_metadata', { id: existingOtpMeta.id }, {
        meta_value: metaValue,
        updated_at: now,
      });
    } else {
      await insert('user_metadata', {
        id: crypto.randomUUID(),
        user_id: user.id,
        meta_key: 'account_activation_otp',
        meta_value: metaValue,
        created_at: now,
        updated_at: now,
      });
    }

    // Send via email or SMS
    try {
      if (method === 'email') {
        await sendEmail({
          to: target,
          subject: 'Mã xác thực kích hoạt tài khoản NikaLearn (Gửi lại)',
          html: generateActivationEmailHTML(activationOtp, user.full_name),
          text: generateActivationEmailText(activationOtp, user.full_name),
        });
      } else {
        await sendSMS({
          to: target,
          message: generateActivationSMSMessage(activationOtp),
        });
      }
    } catch (sendErr) {
      console.warn('Could not dispatch resend activation message (console fallback):', sendErr);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`🔑 [DEV MODE] Mã OTP kích hoạt gửi lại cho ${target}: ${activationOtp}`);
      console.log(`======================================================\n`);
    }

    return NextResponse.json({
      success: true,
      message: `Mã OTP mới đã được gửi về ${method === 'email' ? 'email' : 'số điện thoại'} của bạn!`,
      data: {
        target,
        method,
        devOtp: process.env.NODE_ENV !== 'production' ? activationOtp : undefined,
      },
    });
  } catch (error: any) {
    console.error('Resend activation OTP error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.',
      },
      { status: 500 }
    );
  }
}
