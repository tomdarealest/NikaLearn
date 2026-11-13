import { NextRequest, NextResponse } from 'next/server';
import { queryOneBuilder, insert, update } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intent = 'login', user: oauthUser, provider = 'google' } = body;

    if (!oauthUser) {
      return NextResponse.json(
        { success: false, message: 'Không có thông tin người dùng từ nhà cung cấp OAuth' },
        { status: 400 }
      );
    }

    const meta = oauthUser.user_metadata || {};
    const providerName = (provider || 'google').toLowerCase();

    // Extract email or fallback to synthetic email if OAuth provider didn't return one
    let email = (oauthUser.email || meta.email || '').toLowerCase().trim();
    if (!email) {
      const oauthId = oauthUser.id || crypto.randomUUID().slice(0, 8);
      email = `${providerName}_${oauthId}@${providerName}.nikalearn.edu.vn`;
    }

    // Check if user already exists in public.users
    let user = await queryOneBuilder<any>('users', {
      select: '*',
      filters: { email },
    });

    // 1. If intent is LOGIN and user does not exist
    if (intent === 'login' && !user) {
      return NextResponse.json({
        success: false,
        notRegistered: true,
        email,
        provider: providerName,
        message: `Tài khoản ${providerName === 'google' ? 'Google' : 'Facebook'} này chưa được đăng ký trong hệ thống`,
      });
    }

    const now = new Date().toISOString();
    const fullName = meta.full_name || meta.name || email.split('@')[0];
    const avatarUrl = meta.avatar_url || meta.picture?.data?.url || meta.picture || null;

    // 2. If user does not exist (or intent is REGISTER), create new account
    if (!user) {
      const cleanPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const username = `${cleanPrefix}_${randomSuffix}`.slice(0, 30);
      const newUserId = oauthUser.id && oauthUser.id.length === 36 ? oauthUser.id : crypto.randomUUID();

      const [created] = await insert('users', {
        id: newUserId,
        email,
        password_hash: `OAUTH_${providerName.toUpperCase()}_ACCOUNT`,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: 'STUDENT',
        membership_type: 'FREE',
        learning_streak: 0,
        total_study_time: 0,
        failed_login_attempts: 0,
        is_active: true,
        is_verified: true, // OAuth is verified by Google/Facebook
        last_login: now,
        created_at: now,
        updated_at: now,
      });

      user = created || {
        id: newUserId,
        email,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: 'STUDENT',
        membership_type: 'FREE',
        is_verified: true,
      };
    } else {
      // Existing user: update last login & avatar if needed
      const updates: Record<string, any> = {
        last_login: now,
        updated_at: now,
        is_verified: true, // Mark verified since logged in with OAuth
      };

      if (!user.avatar_url && avatarUrl) {
        updates.avatar_url = avatarUrl;
        user.avatar_url = avatarUrl;
      }

      await update('users', { id: user.id }, updates);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      membership_type: user.membership_type || 'FREE',
      role: user.role || 'STUDENT',
    } as any);

    const publicUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role || 'STUDENT',
      membership_type: user.membership_type || 'FREE',
      is_verified: true,
    };

    const response = NextResponse.json(
      {
        success: true,
        message: `Đăng nhập thành công với ${providerName === 'google' ? 'Google' : 'Facebook'}!`,
        data: {
          user: publicUser,
          token,
          provider: providerName,
        },
      },
      { status: 200 }
    );

    // Set cookie auth_token (30 days)
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: any) {
    console.error('OAuth sync error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi đồng bộ tài khoản OAuth',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
