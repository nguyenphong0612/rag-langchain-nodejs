const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration for file upload (memory storage for serverless)
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed!'), false);
    }
  }
});

// Simple text chunking function
const chunkTexts = (text, chunkSize = 200, overlap = 50) => {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start = end - overlap;
  }
  
  return chunks;
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'RAG API is running' });
});

// Get list of available files (simplified for serverless)
app.get('/api/pdfs', (req, res) => {
  try {
    // For serverless, we'll return a default list since file system is read-only
    res.json({ 
      pdfs: ['nguquan-info.txt'],
      message: 'Serverless mode - using default restaurant data'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get file list' });
  }
});

// Upload PDF (simplified for serverless)
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // In serverless, we can't save files permanently
    // We'll process the file directly from memory
    res.json({ 
      message: 'File uploaded successfully (serverless mode)',
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload TXT (simplified for serverless)
app.post('/api/upload-txt', upload.single('txt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No TXT file uploaded' });
    }

    // In serverless, we can't save files permanently
    res.json({ 
      message: 'TXT uploaded successfully (serverless mode)',
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process PDF (simplified for serverless)
app.post('/api/process-pdf', async (req, res) => {
  try {
    const { pdfPath } = req.body;
    
    if (!pdfPath) {
      return res.status(400).json({ error: 'PDF path is required' });
    }

    console.log('Processing PDF:', pdfPath);
    
    // Simplified processing for serverless
    res.json({ 
      message: 'PDF processing simplified for serverless mode',
      chunks: 0,
      embeddings: 0
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process TXT (simplified for serverless)
app.post('/api/process-txt', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    console.log('Processing TXT:', filePath);
    
    // Simplified processing for serverless
    res.json({ 
      message: 'TXT processing simplified for serverless mode',
      chunks: 0,
      embeddings: 0
    });
  } catch (error) {
    console.error('Error processing TXT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ask question (simplified for serverless)
app.post('/api/ask', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('Question:', question, 'Context:', context);
    
    let relevantChunks = [];
    
    // Mặc định sử dụng dữ liệu nhà hàng từ nguquan-info.txt
    const restaurantDataPath = path.join(__dirname, '../pdfs/nguquan-info.txt');
    if (fs.existsSync(restaurantDataPath)) {
      const restaurantText = fs.readFileSync(restaurantDataPath, 'utf8');
      const restaurantChunks = chunkTexts(restaurantText, 200, 50);
      
      // Tìm chunks liên quan dựa trên từ khóa trong câu hỏi
      const questionLower = question.toLowerCase();
      
      // Logic RAG đơn giản: tìm chunks có chứa từ khóa trong câu hỏi
      relevantChunks = restaurantChunks.filter(chunk => {
        const chunkLower = chunk.toLowerCase();
        
        // Kiểm tra xem chunk có chứa toàn bộ câu hỏi không
        if (chunkLower.includes(questionLower)) {
          return true;
        }
        
        // Kiểm tra từng từ trong câu hỏi
        const words = questionLower.split(' ').filter(word => word.length > 1);
        for (const word of words) {
          if (chunkLower.includes(word)) {
            return true;
          }
        }
        return false;
      });
      
      // Nếu không tìm thấy, lấy 3 chunks đầu tiên
      if (relevantChunks.length === 0) {
        relevantChunks = restaurantChunks.slice(0, 3);
      }
      
      // Giới hạn số lượng chunks để tránh quá dài
      if (relevantChunks.length > 5) {
        relevantChunks = relevantChunks.slice(0, 5);
      }
    }
    
    if (relevantChunks.length === 0) {
      if (fs.existsSync(restaurantDataPath)) {
        return res.json({ 
          answer: 'Xin lỗi, tôi không có thông tin về câu hỏi này. Vui lòng liên hệ hotline: 0382 699 866 để được hỗ trợ trực tiếp.',
          chunks: []
        });
      } else {
        return res.json({ 
          answer: 'Không tìm thấy thông tin liên quan trong tài liệu. Vui lòng thử câu hỏi khác hoặc xử lý file trước.',
          chunks: []
        });
      }
    }
    
    // Generate simple answer based on chunks
    const answer = generateSimpleAnswer(question, relevantChunks);
    
    res.json({ 
      answer,
      chunks: relevantChunks,
      question,
      context: context || 'general'
    });
  } catch (error) {
    console.error('Error generating answer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple answer generation function
function generateSimpleAnswer(question, relevantChunks) {
  const questionLower = question.toLowerCase();
  
  // Check for specific keywords and return appropriate answers
  if (questionLower.includes('địa chỉ') || questionLower.includes('ở đâu')) {
    return 'Nhà hàng Ngư Quán có 2 cơ sở:\n- Cơ sở 1: 123 Đường ABC, Quận 1, TP.HCM\n- Cơ sở 2: 456 Đường XYZ, Quận 7, TP.HCM';
  }
  
  if (questionLower.includes('hotline') || questionLower.includes('số điện thoại') || questionLower.includes('liên hệ')) {
    return 'Hotline đặt bàn: 0382 699 866';
  }
  
  if (questionLower.includes('giờ') || questionLower.includes('mở cửa')) {
    return 'Giờ mở cửa: 10:00 - 22:00 (Thứ 2 - Chủ nhật)';
  }
  
  if (questionLower.includes('giá') || questionLower.includes('bao nhiêu')) {
    return 'Giá các món ăn dao động từ 50.000đ - 500.000đ. Vui lòng liên hệ hotline để biết thêm chi tiết.';
  }
  
  if (questionLower.includes('món') || questionLower.includes('ăn')) {
    return 'Nhà hàng chuyên về các món cá sông tươi ngon như: cá lăng, cá chình, cá trắm, cá quả...';
  }
  
  // Default answer based on chunks
  const combinedChunks = relevantChunks.join(' ');
  if (combinedChunks.length > 200) {
    return combinedChunks.substring(0, 200) + '...';
  }
  
  return combinedChunks || 'Xin lỗi, tôi không có thông tin về câu hỏi này. Vui lòng liên hệ hotline: 0382 699 866 để được hỗ trợ trực tiếp.';
}

// Export for Vercel
module.exports = app;
