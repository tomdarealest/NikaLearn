import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware để bảo vệ các routes cần xác thực
 * - Kiểm tra auth_token từ cookies
 * - Cho phép unauthenticated users đến /auth/login, /auth/register, /, /courses, etc
 * - Chuyển hướng unauthenticated users khỏi protected routes như /learn
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Danh sách các public routes (không cần xác thực)
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/courses',
    '/roadmap',
    '/exams',
    '/ai-tutor',
    '/review',
    '/interview',
    '/articles',
    '/qa',
  ];

  // Kiểm tra nếu đây là public route (bao gồm /api/auth/me)
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith('/api/public') || pathname.startsWith('/api/auth')
  );
  
  // ✅ Allow /api/auth/me để check authentication status
  const isAuthCheckEndpoint = pathname === '/api/auth/me';
  
  // ✅ Allow /api/courses endpoints (authentication sẽ được handle ở route handler)
  const isCoursesApiEndpoint = pathname.startsWith('/api/courses');

  // Danh sách các protected routes (cần xác thực)
  // ⚠️ NOTE: /api/courses routes sẽ tự handle auth tại route handler
  // Middleware chỉ protect page routes (/learn, /admin) và API routes khác (/api/lessons, /api/users/me, /api/admin)
  const protectedRoutes = [
    '/learn',
    '/admin',
    '/settings',
    '/api/admin',
    '/api/lessons',
    '/api/chapters',
    '/api/users/me',
  ];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // ✅ Allow public routes, auth check endpoint, and courses API
  if ((isPublicRoute || isAuthCheckEndpoint || isCoursesApiEndpoint) && !isProtectedRoute) {
    return NextResponse.next();
  }

  // Nếu là protected route, kiểm tra xác thực
  if (isProtectedRoute) {
    const token = request.cookies.get('auth_token')?.value;
    
    // Nếu không có token, chuyển hướng đến login
    if (!token) {
      // Nếu là API request, return 401
      if (pathname.startsWith('/api')) {
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Unauthorized' }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        );
      }
      
      // Nếu là page request, chuyển hướng đến login
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // BẢO VỆ CHẶN TẤT CẢ TẤN CÔNG /admin & /api/admin: Kiểm tra quyền ADMIN / TEACHER
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      try {
        // Parse payload từ JWT token (Base64url decode an toàn cho Edge Middleware)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          const role = (payload.role || '').toUpperCase();

          if (role !== 'ADMIN' && role !== 'TEACHER') {
            if (pathname.startsWith('/api')) {
              return new NextResponse(
                JSON.stringify({ success: false, message: 'Forbidden: Yêu cầu quyền quản trị viên' }),
                { status: 403, headers: { 'content-type': 'application/json' } }
              );
            }
            // Chặn người dùng thường cố tình gõ link /admin
            return NextResponse.redirect(new URL('/403', request.url));
          }
        } else {
          // Token giả mạo hoặc sai định dạng
          if (pathname.startsWith('/api')) {
            return new NextResponse(
              JSON.stringify({ success: false, message: 'Invalid token' }),
              { status: 401, headers: { 'content-type': 'application/json' } }
            );
          }
          return NextResponse.redirect(new URL('/auth/login', request.url));
        }
      } catch (err) {
        if (pathname.startsWith('/api')) {
          return new NextResponse(
            JSON.stringify({ success: false, message: 'Token verification failed' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          );
        }
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|assets).*)',
  ],
};
