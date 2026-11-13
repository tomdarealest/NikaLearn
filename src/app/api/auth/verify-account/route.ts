import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, update, deleteRows } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/auth/verify-account
 * 
 * Xác thực mã OTP 6 số để kích hoạt tài khoản
 * Body:
 * - userId?: string
 * - email?: string
 * - phone?: string
 * - otp: string (6 digits)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, phone, otp } = body;

    if (!otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã OTP không hợp lệ, vui lòng nhập đủ 6 chữ số',
        },
        { status: 400 }
      );
    }

    if (!userId && !email && !phone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu thông tin nhận diện tài khoản (userId, email hoặc số điện thoại)',
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
          message: 'Không tìm thấy tài khoản',
        },
        { status: 404 }
      );
    }

    if (user.is_verified) {
      // Already activated, issue token and log in
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        membership_type: user.membership_type,
      } as any);

      const response = NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Tài khoản đã được kích hoạt trước đó',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            role: user.role,
            is_verified: true,
          },
          token,
        },
      });

      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    // Retrieve activation OTP from user_metadata
    const otpMeta = await queryOneBuilder<{ meta_value: string }>('user_metadata', {
      select: 'meta_value',
      filters: {
        user_id: user.id,
        meta_key: 'account_activation_otp',
      },
    });

    if (!otpMeta || !otpMeta.meta_value) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã.',
        },
        { status: 400 }
      );
    }

    let parsedMeta: { hash: string; expiresAt: string };
    try {
      parsedMeta = JSON.parse(otpMeta.meta_value);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Dữ liệu xác thực không hợp lệ',
        },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(parsedMeta.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã OTP đã hết hạn. Vui lòng nhấn "Gửi lại mã" để nhận mã mới.',
        },
        { status: 400 }
      );
    }

    // Verify OTP hash
    const inputHash = crypto
      .createHash('sha256')
      .update(otp + (process.env.JWT_SECRET || 'fallback-secret'))
      .digest('hex');

    if (inputHash !== parsedMeta.hash) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại.',
        },
        { status: 400 }
      );
    }

    // OTP is valid! Activate user
    const now = new Date().toISOString();
    await update('users', { id: user.id }, {
      is_verified: true,
      last_login: now,
      updated_at: now,
    });

    // Delete used activation OTP
    try {
      await deleteRows('user_metadata', {
        user_id: user.id,
        meta_key: 'account_activation_otp',
      });
    } catch (cleanupErr) {
      console.warn('Cleanup activation OTP notice:', cleanupErr);
    }

    // Generate JWT token for auto-login
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      membership_type: user.membership_type,
    } as any);

    const response = NextResponse.json(
      {
        success: true,
        message: 'Kích hoạt tài khoản thành công! Đang tự động đăng nhập...',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            phone: user.phone,
            role: user.role,
            membership_type: user.membership_type,
            learning_streak: user.learning_streak,
            total_study_time: user.total_study_time,
            is_verified: true,
            created_at: user.created_at,
          },
          token,
        },
      },
      { status: 200 }
    );

    // Set auth cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Verify account error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Đã xảy ra lỗi khi xác thực tài khoản',
      },
      { status: 500 }
    );
  }
}
