import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder, queryOneBuilder, insert } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: string | null;
  membership_type: string;
  is_active: boolean;
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
}

const createUserSchema = z.object({
  full_name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(200),
  username: z
    .string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(100)
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ, số và dấu gạch dưới'),
  email: z.string().email('Email không hợp lệ').max(255),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(100),
  role: z.enum(['admin', 'student'], {
    message: 'Vai trò không hợp lệ',
  }),
});

/**
 * GET /api/admin/users
 * List registered users from the users table
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const role = searchParams.get('role')?.trim() || '';

    const users = await queryBuilder<AdminUserRow>('users', {
      select:
        'id, email, username, full_name, avatar_url, phone, role, membership_type, is_active, is_verified, last_login, created_at',
      orderBy: { column: 'created_at', ascending: false },
    });

    let filtered = users || [];

    if (role) {
      filtered = filtered.filter(
        (u) => (u.role || 'student').toLowerCase() === role.toLowerCase()
      );
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
      );
    }

    const stats = {
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      verified: users.filter((u) => u.is_verified).length,
      admin: users.filter((u) => (u.role || '').toLowerCase() === 'admin').length,
      student: users.filter((u) => {
        const r = (u.role || 'student').toLowerCase();
        return r === 'student' || r === 'user' || !u.role;
      }).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        users: filtered,
        stats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tải danh sách người dùng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user from admin panel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ';
      return NextResponse.json(
        { success: false, message: firstError },
        { status: 400 }
      );
    }

    const { full_name, username, email, password, role } = validation.data;

    const existingEmail = await queryOneBuilder<{ id: string }>('users', {
      select: 'id',
      filters: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: 'Email đã được sử dụng' },
        { status: 409 }
      );
    }

    const existingUsername = await queryOneBuilder<{ id: string }>('users', {
      select: 'id',
      filters: { username },
    });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: 'Tên đăng nhập đã được sử dụng' },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();

    const [newUser] = await insert<AdminUserRow>('users', {
      id: crypto.randomUUID(),
      email,
      password_hash,
      username,
      full_name,
      role,
      membership_type: role === 'admin' ? 'PRO' : 'FREE',
      is_active: true,
      is_verified: true,
      learning_streak: 0,
      total_study_time: 0,
      failed_login_attempts: 0,
      created_at: now,
      updated_at: now,
    } as any);

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Tạo người dùng thành công',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            full_name: newUser.full_name,
            role: newUser.role,
            membership_type: newUser.membership_type,
            is_active: newUser.is_active,
            is_verified: newUser.is_verified,
            created_at: newUser.created_at,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tạo người dùng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
