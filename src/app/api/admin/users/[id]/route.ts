import { NextRequest, NextResponse } from 'next/server';
import { queryBuilder, queryOneBuilder, update, deleteRows } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const updateUserSchema = z.object({
  full_name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(200).optional(),
  username: z
    .string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(100)
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ, số và dấu gạch dưới')
    .optional(),
  email: z.string().email('Email không hợp lệ').max(255).optional(),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(100)
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'student']).optional(),
  is_active: z.boolean().optional(),
  membership_type: z.enum(['FREE', 'PRO']).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/users/[id]
 * Update user details and/or password
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID người dùng' }, { status: 400 });
    }

    const existing = await queryOneBuilder<{
      id: string;
      email: string;
      username: string;
      role: string | null;
    }>('users', {
      select: 'id, email, username, role',
      filters: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ';
      return NextResponse.json({ success: false, message: firstError }, { status: 400 });
    }

    const data = validation.data;
    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.full_name !== undefined) patch.full_name = data.full_name.trim();
    if (data.role !== undefined) {
      patch.role = data.role;
      if (data.membership_type === undefined) {
        patch.membership_type = data.role === 'admin' ? 'PRO' : 'FREE';
      }
    }
    if (data.membership_type !== undefined) patch.membership_type = data.membership_type;
    if (data.is_active !== undefined) patch.is_active = data.is_active;

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailTaken = await queryOneBuilder<{ id: string }>('users', {
          select: 'id',
          filters: { email },
        });
        if (emailTaken && emailTaken.id !== id) {
          return NextResponse.json(
            { success: false, message: 'Email đã được sử dụng' },
            { status: 409 }
          );
        }
        patch.email = email;
      }
    }

    if (data.username !== undefined) {
      const username = data.username.trim();
      if (username !== existing.username) {
        const usernameTaken = await queryOneBuilder<{ id: string }>('users', {
          select: 'id',
          filters: { username },
        });
        if (usernameTaken && usernameTaken.id !== id) {
          return NextResponse.json(
            { success: false, message: 'Tên đăng nhập đã được sử dụng' },
            { status: 409 }
          );
        }
        patch.username = username;
      }
    }

    if (data.password && data.password.length > 0) {
      patch.password_hash = await hashPassword(data.password);
    }

    const updated = await update('users', { id }, patch);
    const user = Array.isArray(updated) ? updated[0] : updated;

    return NextResponse.json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: { user },
    });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể cập nhật người dùng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user (student preferred; blocks last admin)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu ID người dùng' }, { status: 400 });
    }

    const existing = await queryOneBuilder<{
      id: string;
      role: string | null;
      full_name: string;
      username: string;
    }>('users', {
      select: 'id, role, full_name, username',
      filters: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const role = (existing.role || 'student').toLowerCase();
    if (role === 'admin') {
      const admins = await queryBuilder<{ id: string }>('users', {
        select: 'id',
        filters: { role: 'admin' },
      });
      if (admins.length <= 1) {
        return NextResponse.json(
          { success: false, message: 'Không thể xóa admin cuối cùng của hệ thống' },
          { status: 400 }
        );
      }
    }

    // Clean up related metadata if exists
    try {
      await deleteRows('user_metadata', { user_id: id });
    } catch {
      // ignore if table/relation missing
    }

    await deleteRows('users', { id });

    return NextResponse.json({
      success: true,
      message: `Đã xóa người dùng ${existing.full_name || existing.username}`,
    });
  } catch (error: any) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error?.code === '23503'
            ? 'Không thể xóa vì người dùng còn dữ liệu liên quan (khóa học, bài viết...)'
            : 'Không thể xóa người dùng',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
