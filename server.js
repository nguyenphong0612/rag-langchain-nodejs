require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { chunkTexts } = require('./src/chunk-texts');
const { embedTexts } = require('./src/embed-texts');
const { generateAnswer } = require('./src/generate-answer');
const { extractTextsFromPDF } = require('./src/parse-pdf');
const { checkIndexExists, createIndex, describeIndexStats, retrieveRelevantChunks, storeEmbeddings } = require('./src/vector-db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './pdfs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed!'), false);
    }
  }
});

// Initialize database
const initDatabase = async () => {
  const indexExists = await checkIndexExists();
  console.log('Index exists:', indexExists);
  if (!indexExists) {
    await createIndex();
    console.log('Database index created');
  } else {
    const indexStats = await describeIndexStats();
    console.log('Index stats:', indexStats);
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'RAG API is running' });
});

// Get list of available files
app.get('/api/pdfs', (req, res) => {
  try {
    const filesDir = './pdfs';
    if (!fs.existsSync(filesDir)) {
      return res.json({ pdfs: [] });
    }
    
    const files = fs.readdirSync(filesDir);
    const supportedFiles = files.filter(file => 
      file.toLowerCase().endsWith('.pdf') || file.toLowerCase().endsWith('.txt')
    );
    res.json({ pdfs: supportedFiles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get file list' });
  }
});

// Upload PDF
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    res.json({ 
      message: 'PDF uploaded successfully',
      filename: req.file.originalname,
      path: filePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload TXT
app.post('/api/upload-txt', upload.single('txt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No TXT file uploaded' });
    }

    const filePath = req.file.path;
    res.json({ 
      message: 'TXT uploaded successfully',
      filename: req.file.originalname,
      path: filePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process PDF (extract text, chunk, embed, store)
app.post('/api/process-pdf', async (req, res) => {
  try {
    const { pdfPath } = req.body;
    
    if (!pdfPath) {
      return res.status(400).json({ error: 'PDF path is required' });
    }

    console.log('Processing PDF:', pdfPath);
    
    // Extract text from PDF
    const pdfTexts = await extractTextsFromPDF(pdfPath);
    
    // Chunk the text
    const pdfChunks = chunkTexts(pdfTexts);
    
    // Generate embeddings
    const embeddings = await embedTexts(pdfChunks);
    
    // Store in vector database
    await storeEmbeddings(embeddings);
    
    res.json({ 
      message: 'PDF processed successfully',
      chunks: pdfChunks.length,
      embeddings: embeddings.length
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process TXT (read text, chunk, embed, store)
app.post('/api/process-txt', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    console.log('Processing TXT:', filePath);
    
    // Read text from TXT file
    const txtContent = fs.readFileSync(filePath, 'utf8');
    
    // Chunk the text
    const txtChunks = chunkTexts(txtContent);
    
    // Generate embeddings
    const embeddings = await embedTexts(txtChunks);
    
    // Store in vector database
    await storeEmbeddings(embeddings);
    
    res.json({ 
      message: 'TXT processed successfully',
      chunks: txtChunks.length,
      embeddings: embeddings.length
    });
  } catch (error) {
    console.error('Error processing TXT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ask question
app.post('/api/ask', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('Question:', question, 'Context:', context);
    console.log('Question length:', question.length);
    console.log('Question bytes:', Buffer.from(question, 'utf8').length);
    
    let relevantChunks = [];
    
    // Mặc định sử dụng dữ liệu nhà hàng từ nguquan-info.txt
    const restaurantDataPath = './pdfs/nguquan-info.txt';
    if (fs.existsSync(restaurantDataPath)) {
      const restaurantText = fs.readFileSync(restaurantDataPath, 'utf8');
      const restaurantChunks = chunkTexts(restaurantText, 500, 100); // Tăng chunk size để có context tốt hơn
      
      // Tìm chunks liên quan với logic cải thiện
      const questionLower = question.toLowerCase();
      
      // Tạo danh sách từ khóa quan trọng
      const keywords = extractKeywords(questionLower);
      
      // Tính điểm relevance cho từng chunk
      const scoredChunks = restaurantChunks.map(chunk => {
        const chunkLower = chunk.toLowerCase();
        let score = 0;
        
        // Điểm cho từ khóa chính xác
        for (const keyword of keywords) {
          if (chunkLower.includes(keyword)) {
            score += 10;
          }
        }
        
        // Điểm cho các từ quan trọng trong câu hỏi
        const questionWords = questionLower.split(' ').filter(word => word.length > 2);
        for (const word of questionWords) {
          if (chunkLower.includes(word)) {
            score += 2;
          }
        }
        
        // Điểm bonus cho chunks có thông tin cụ thể
        if (chunkLower.includes('địa chỉ') || chunkLower.includes('hotline') || 
            chunkLower.includes('giá') || chunkLower.includes('mở cửa')) {
          score += 5;
        }
        
        return { chunk, score };
      });
      
      // Sắp xếp theo điểm số và lấy top chunks
      scoredChunks.sort((a, b) => b.score - a.score);
      relevantChunks = scoredChunks
        .filter(item => item.score > 0)
        .slice(0, 5)
        .map(item => item.chunk);
      
      // Nếu không tìm thấy chunks có điểm > 0, lấy 3 chunks đầu tiên
      if (relevantChunks.length === 0) {
        relevantChunks = restaurantChunks.slice(0, 3);
      }
    } else {
      // Fallback: sử dụng dữ liệu PDF/TXT thông thường nếu không có file nguquan-info.txt
      relevantChunks = await retrieveRelevantChunks(question);
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
    
    // Generate answer mặc định sử dụng prompt nhà hàng
    let answer;
    if (fs.existsSync(restaurantDataPath)) {
      answer = await generateRestaurantAnswer(question, relevantChunks);
    } else {
      answer = await generateAnswer(question, relevantChunks);
    }
    
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

// Hàm trích xuất từ khóa từ câu hỏi
function extractKeywords(question) {
  const keywords = [];
  
  // Từ khóa về địa chỉ
  if (question.includes('địa chỉ') || question.includes('ở đâu') || question.includes('chỗ nào')) {
    keywords.push('địa chỉ', 'cơ sở', 'hoàng quán chi', 'thành phố giao lưu');
  }
  
  // Từ khóa về liên hệ
  if (question.includes('số điện thoại') || question.includes('hotline') || question.includes('liên hệ')) {
    keywords.push('hotline', 'zalo', '0382', '0365');
  }
  
  // Từ khóa về giá
  if (question.includes('giá') || question.includes('bao nhiêu') || question.includes('tiền')) {
    keywords.push('giá', 'đồng', '000đ');
  }
  
  // Từ khóa về giờ mở cửa
  if (question.includes('mở cửa') || question.includes('giờ') || question.includes('thời gian')) {
    keywords.push('mở cửa', 'buổi trưa', 'buổi tối');
  }
  
  // Từ khóa về món ăn
  if (question.includes('món') || question.includes('ăn') || question.includes('thực đơn')) {
    keywords.push('món', 'cá', 'thực đơn', 'đặc sản');
  }
  
  // Từ khóa về đặt bàn
  if (question.includes('đặt bàn') || question.includes('đặt chỗ')) {
    keywords.push('đặt bàn', 'online');
  }
  
  return keywords;
}

// Function để generate answer cho nhà hàng
async function generateRestaurantAnswer(question, relevantChunks) {
  const { generateAnswer } = require('./src/generate-answer');
  
  // Tạo prompt đặc biệt cho nhà hàng
  const restaurantPrompt = `Bạn là trợ lý ảo thân thiện của nhà hàng Ngư Quán - Đặc sản cá sông số 1 Việt Nam. Hãy trả lời câu hỏi của khách hàng một cách tự nhiên, mượt mà và đầy đủ thông tin.

HƯỚNG DẪN TRẢ LỜI:
1. **Giọng điệu**: Thân thiện, chuyên nghiệp, như đang nói chuyện trực tiếp với khách
2. **Thông tin**: Chỉ sử dụng thông tin có trong dữ liệu được cung cấp
3. **Cấu trúc**: Trả lời rõ ràng, có thể chia thành các ý nhỏ nếu cần
4. **Tự nhiên**: Sử dụng ngôn ngữ tự nhiên, không robot
5. **Đầy đủ**: Cung cấp đủ thông tin khách cần, không thừa không thiếu

THÔNG TIN THAM KHẢO:
${relevantChunks.join('\n\n')}

Câu hỏi của khách: ${question}

Hãy trả lời một cách tự nhiên và hữu ích:`;

  // Sử dụng generateAnswer với prompt đặc biệt
  return await generateAnswer(question, relevantChunks, restaurantPrompt);
}

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

