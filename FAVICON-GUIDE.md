# 🦈 Hướng Dẫn Favicon - Nhà Hàng Ngư Quán

## Tổng Quan

Đã tạo biểu tượng favicon cho nhà hàng Ngư Quán với thiết kế cá phù hợp với đặc sản cá sông.

## Các File Đã Tạo

### 1. `public/favicon.svg`
- **Định dạng**: SVG (vector)
- **Ưu điểm**: Sắc nét ở mọi kích thước, nhẹ
- **Hỗ trợ**: Trình duyệt hiện đại

### 2. `public/favicon.png` (placeholder)
- **Định dạng**: PNG
- **Ưu điểm**: Tương thích rộng
- **Trạng thái**: Cần tạo file thực tế

### 3. `public/favicon.ico` (placeholder)
- **Định dạng**: ICO
- **Ưu điểm**: Tương thích với trình duyệt cũ
- **Trạng thái**: Cần tạo file thực tế

### 4. `convert-favicon.html`
- **Mục đích**: Công cụ chuyển đổi SVG thành PNG/ICO
- **Cách dùng**: Mở file trong trình duyệt và nhấn nút download

## Thiết Kế Favicon

### Màu Sắc
- **Nền**: Gradient xanh dương (#1e3a8a → #3b82f6)
- **Cá**: Vàng (#fbbf24) với viền cam (#d97706)
- **Mắt**: Đen (#1f2937) với điểm sáng trắng
- **Bong bóng**: Xanh nhạt (#60a5fa)

### Ý Nghĩa
- **Cá**: Đại diện cho đặc sản cá sông
- **Màu xanh**: Tượng trưng cho nước, sông
- **Màu vàng**: Tượng trưng cho sự sang trọng, chất lượng

## Cách Sử Dụng

### Bước 1: Tạo File PNG và ICO
1. Mở file `convert-favicon.html` trong trình duyệt
2. Nhấn nút "Tạo Favicon PNG" để download file PNG
3. Để tạo ICO, sử dụng công cụ online như:
   - [favicon.io](https://favicon.io/)
   - [convertio.co](https://convertio.co/svg-ico/)

### Bước 2: Thay Thế File Placeholder
1. Copy file PNG đã tạo vào thư mục `public/`
2. Copy file ICO đã tạo vào thư mục `public/`
3. Thay thế các file placeholder hiện tại

### Bước 3: Kiểm Tra
1. Khởi động server: `node server.js`
2. Mở trình duyệt và truy cập website
3. Kiểm tra favicon trên tab trình duyệt

## Cấu Hình HTML

Đã thêm các thẻ favicon vào cả `index.html` và `admin.html`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="shortcut icon" href="/favicon.svg">
```

## Tương Thích Trình Duyệt

| Trình duyệt | SVG | PNG | ICO |
|-------------|-----|-----|-----|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| IE | ❌ | ✅ | ✅ |

## Tùy Chỉnh

### Thay Đổi Màu Sắc
Chỉnh sửa file `public/favicon.svg`:
- Thay đổi `stop-color` trong `linearGradient`
- Thay đổi `fill` của các phần tử

### Thay Đổi Kích Thước
- SVG tự động scale
- PNG/ICO nên có kích thước 32x32, 16x16, 48x48

## Lưu Ý

1. **Cache trình duyệt**: Có thể cần clear cache để thấy favicon mới
2. **HTTPS**: Favicon hoạt động tốt hơn trên HTTPS
3. **Performance**: SVG nhẹ hơn PNG/ICO
4. **Fallback**: Luôn có nhiều định dạng để đảm bảo tương thích

## Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra đường dẫn file favicon
2. Clear cache trình duyệt
3. Kiểm tra console để xem lỗi
4. Đảm bảo server đang chạy
