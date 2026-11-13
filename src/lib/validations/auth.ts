import { z } from 'zod';

// Register validation schema - Supports unified Email or Phone
export const registerSchema = z
  .object({
    contact: z.string().optional().or(z.literal('')),
    registerMethod: z.enum(['email', 'phone']).optional(),
    email: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    password: z
      .string()
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .max(100, 'Mật khẩu quá dài')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Mật khẩu phải chứa chữ hoa, chữ thường và số'
      ),
    username: z
      .string()
      .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
      .max(100, 'Tên đăng nhập quá dài')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Tên đăng nhập chỉ chứa chữ, số và dấu gạch dưới'
      ),
    full_name: z
      .string()
      .min(2, 'Họ tên phải có ít nhất 2 ký tự')
      .max(200, 'Họ tên quá dài'),
  })
  .refine(
    (data) => {
      const raw = (data.contact || data.email || data.phone || '').trim();
      return raw.length > 0;
    },
    {
      message: 'Vui lòng nhập Email hoặc Số điện thoại',
      path: ['contact'],
    }
  );

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập Email, Số điện thoại hoặc Tên đăng nhập'),
  password: z
    .string()
    .min(1, 'Mật khẩu là bắt buộc'),
  rememberMe: z.boolean().optional(),
});

// Types from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
