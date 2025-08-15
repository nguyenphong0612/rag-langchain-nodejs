# Ngư Quán Phong Dev - Website với RAG AI

Website demo cho nhà hàng Ngư Quán với tích hợp hệ thống RAG (Retrieval-Augmented Generation) AI để hỗ trợ khách hàng.

## 🚀 Deploy lên Vercel

### Cách 1: Deploy trực tiếp từ GitHub
1. Push code lên GitHub repository
2. Truy cập [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project" → Import từ GitHub
4. Cấu hình Environment Variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PINECONE_API_KEY`: Your Pinecone API key
5. Click "Deploy"

### Cách 2: Deploy bằng Vercel CLI
```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Login và deploy
vercel login
vercel

# Cấu hình environment variables
vercel env add OPENAI_API_KEY
vercel env add PINECONE_API_KEY
```

### Environment Variables cần thiết
- `OPENAI_API_KEY`: API key từ OpenAI
- `PINECONE_API_KEY`: API key từ Pinecone
- `PORT`: Port server (Vercel sẽ tự động set)

### Lưu ý quan trọng cho Vercel
- **Serverless Functions**: Project sử dụng Vercel serverless functions trong thư mục `api/`
- **File Upload**: Trong serverless mode, file upload được xử lý trong memory (không lưu trữ vĩnh viễn)
- **Database**: Pinecone vector database hoạt động bình thường
- **Local Development**: Vẫn có thể chạy `npm start` để test locally với `server.js`

## 🌟 Tính năng chính

### Website chính (Trang chủ)
- **Giao diện nhà hàng**: Thiết kế đẹp mắt với thông tin nhà hàng
- **Thực đơn**: Hiển thị các món ăn đặc sản cá sông
- **Thông tin liên hệ**: Địa chỉ, hotline, giờ mở cửa
- **Chat AI**: Widget chat thông minh tích hợp RAG system

### Trang Admin (/admin)
- **Quản lý tài liệu**: Upload và xử lý file PDF/TXT
- **RAG System**: Chat với AI dựa trên tài liệu đã xử lý
- **Vector Database**: Lưu trữ embeddings trong Pinecone

## 🚀 Cài đặt và chạy

### Yêu cầu
- Node.js >= 18.0.0
- OpenAI API Key
- Pinecone API Key

### Cài đặt
```bash
# Clone project
git clone <repository-url>
cd rag-langchain-nodejs

# Cài đặt dependencies
npm install

# Tạo file .env
echo "OPENAI_API_KEY=your_openai_api_key" > .env
echo "PINECONE_API_KEY=your_pinecone_api_key" >> .env
echo "PORT=3000" >> .env
```

### Chạy ứng dụng
```bash
# Chạy server
npm start

# Truy cập website
# Trang chủ: http://localhost:3000
# Trang admin: http://localhost:3000/admin
```

## 📱 Sử dụng

### 1. Trang chủ (http://localhost:3000)
- Xem thông tin nhà hàng và thực đơn
- Click nút 💬 để mở chat AI
- Hỏi đáp về nhà hàng, thực đơn, đặt bàn

### 2. Trang Admin (http://localhost:3000/admin)
- Upload file PDF/TXT chứa thông tin nhà hàng
- Xử lý file để tạo embeddings
- Chat với AI dựa trên tài liệu đã xử lý

### 3. API Endpoints
- `GET /api/health` - Kiểm tra trạng thái
- `GET /api/pdfs` - Lấy danh sách file
- `POST /api/upload-pdf` - Upload file
- `POST /api/process-pdf` - Xử lý file
- `POST /api/ask` - Hỏi câu hỏi

## 🏗️ Cấu trúc project

```
rag-langchain-nodejs/
├── api/                  # Vercel serverless functions
│   └── index.js         # Main API handler
├── src/                  # Core RAG modules
│   ├── parse-pdf.js     # PDF parsing
│   ├── chunk-texts.js   # Text chunking
│   ├── embed-texts.js   # Text embedding
│   ├── generate-answer.js # Answer generation
│   └── vector-db.js     # Vector database
├── public/              # Frontend files
│   ├── index.html      # Trang chủ Ngư Quán
│   ├── admin.html      # Trang admin RAG
│   └── script.js       # JavaScript logic
├── pdfs/               # File storage
│   └── nguquan-info.txt # Thông tin nhà hàng
├── server.js           # Express server (local development)
├── vercel.json         # Vercel configuration
└── package.json
```

## 🎯 Demo Chat AI

### Câu hỏi mẫu cho khách hàng:
- "Nhà hàng có mấy cơ sở?"
- "Địa chỉ cơ sở 1 ở đâu?"
- "Hotline liên hệ là gì?"
- "Có món gì ngon?"
- "Giá cá chình suối bao nhiêu?"
- "Làm sao để đặt bàn?"
- "Giờ mở cửa từ mấy giờ?"

### Tính năng AI:
- **Context-aware**: Hiểu ngữ cảnh nhà hàng
- **Fallback responses**: Trả lời ngay cả khi API lỗi
- **Natural language**: Giao tiếp tự nhiên bằng tiếng Việt
- **Real-time**: Phản hồi nhanh chóng

## 🔧 Tùy chỉnh

### Thay đổi thông tin nhà hàng
Chỉnh sửa file `public/index.html` để cập nhật:
- Tên nhà hàng
- Thực đơn và giá
- Thông tin liên hệ
- Màu sắc và style

### Cập nhật dữ liệu AI
1. Upload file PDF/TXT mới vào trang admin
2. Xử lý file để tạo embeddings
3. Chat AI sẽ sử dụng thông tin mới

### Tùy chỉnh giao diện
- CSS styles trong `public/index.html`
- JavaScript logic trong `public/script.js`
- Responsive design cho mobile

## 📊 Monitoring

### Logs
- Server logs hiển thị trong terminal
- API requests được log tự động
- Error handling cho tất cả endpoints

### Performance
- Caching embeddings để tăng tốc độ
- Optimized file upload và processing
- Efficient vector search

## 🎓 Mục đích học tập

Project này được tạo ra để:
- **Học RAG system**: Hiểu cách hoạt động của RAG
- **Tích hợp AI**: Kết hợp AI với website thực tế
- **Full-stack development**: Frontend + Backend + AI
- **Real-world application**: Ứng dụng thực tế cho nhà hàng

## 📄 License

MIT License - Tự do sử dụng cho mục đích học tập và nghiên cứu.

---

**Lưu ý**: Đây là project demo cho mục đích học tập. Thông tin nhà hàng được sử dụng chỉ để minh họa.