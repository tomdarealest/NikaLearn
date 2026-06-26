# DHV LearnX - Nền tảng học lập trình trực tuyến

> **Đồ án Chuyên ngành Công nghệ Thông tin**
>
> **Sinh viên thực hiện:** Huỳnh Văn Khuân (MSSV: 2205CT0035)
> **Lớp:** CT06PM - Khoa Kỹ thuật Công nghệ
> **Trường:** Đại học Hùng Vương TP. Hồ Chí Minh
> **Giảng viên hướng dẫn:** ThS. Nguyễn Thanh Tiến
>
> **Website:** [https://dhvlearnx.page](https://dhvlearnx.page)

## 📖 Giới thiệu

**DHV LearnX** là nền tảng học lập trình trực tuyến hiện đại, được xây dựng nhằm cung cấp trải nghiệm học tập bài bản, tương tác và cá nhân hóa. Dự án tập trung vào việc giúp người học tiếp cận kiến thức công nghệ mới một cách dễ dàng thông qua lộ trình rõ ràng, hệ thống bài giảng video chất lượng và cộng đồng hỗ trợ tích cực.

## 🎯 Mục tiêu dự án

- Xây dựng hệ thống E-learning hoàn chỉnh với đầy đủ các tính năng quản lý khóa học, bài học và người dùng.
- Tích hợp các công nghệ hiện đại để tối ưu hóa trải nghiệm người dùng (Next.js 15, Supabase, AI).
- Triển khai sản phẩm thực tế trên môi trường production.
- Đạt các tiêu chuẩn về hiệu năng, bảo mật và khả năng mở rộng.

## 🚀 Công nghệ sử dụng

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, CSS Modules
- **State Management**: React Context, Hooks
- **UI Components**: Lucide React, Custom Components
- **Charts**: Recharts

### Backend & Database
- **Platform**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage / Cloudinary
- **API**: Next.js API Routes

### Deployment
- **Domain**: 
- **Hosting**: 

## ✨ Tính năng chính

### 👤 Người dùng (Học viên)
- **Hệ thống khóa học**: Truy cập các khóa học theo lộ trình (Frontend, Backend, Mobile, etc.).
- **Học tập tương tác**: Xem video bài giảng, đọc tài liệu Markdown, làm bài tập/quiz.
- **Theo dõi tiến độ**: Lưu trạng thái hoàn thành bài học, biểu đồ tiến độ cá nhân.
- **Ghi chú & Hỏi đáp**: Tạo ghi chú cá nhân, tham gia thảo luận và hỏi đáp.
- **Profile cá nhân**: Quản lý thông tin, xem chứng chỉ (dự kiến).

### 🛠️ Quản trị viên (Admin/Teacher)
- **Dashboard thống kê**: Xem tổng quan về số lượng khóa học, bài học, người dùng và hoạt động.
- **Quản lý nội dung**:
    - Tạo/Sửa/Xóa khóa học, chương, bài học.
    - Soạn thảo nội dung bài học bằng Markdown editor chuyên nghiệp.
    - Quản lý trạng thái xuất bản (Draft/Published).
- **Quản lý người dùng**: Xem danh sách và phân quyền người dùng.

## 📦 Cấu trúc dự án

```
src/
├── app/
│   ├── (main)/           # Layout chính cho người dùng
│   ├── admin/            # Giao diện quản trị
│   ├── api/              # API Routes
│   ├── auth/             # Trang đăng nhập/đăng ký
│   └── ...
├── components/           # Các component tái sử dụng
├── lib/                  # Các hàm tiện ích, cấu hình database
├── styles/               # Global styles
└── types/                # TypeScript definitions
```

## 🛠️ Hướng dẫn cài đặt (Local Development)

1. **Clone repository:**
    ```bash
    git clone https://github.com/huynhkhuanit/elearning-system.git
    cd elearning-system/src/dhvlearnx
    ```

2. **Cài đặt dependencies:**
    ```bash
    pnpm install
    ```

3. **Cấu hình biến môi trường:**
    Tạo file `.env.local` và điền các thông tin cần thiết (Supabase URL, Anon Key, etc.).

4. **Chạy development server:**
    ```bash
    pnpm dev
    ```

5. **Truy cập:** [http://localhost:3000](http://localhost:3000)

## 📝 Liên hệ



---
© 2026. All rights reserved.