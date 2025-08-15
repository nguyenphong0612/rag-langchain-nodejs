// RAG System cho Ngư Quán Phong Dev
class RAGSystem {
    constructor() {
        this.selectedFile = null;
        this.selectedPdf = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPdfList();
    }

    setupEventListeners() {
        // File upload
        const fileUpload = document.getElementById('fileUpload');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');

        if (fileUpload && fileInput && uploadBtn) {
            fileUpload.addEventListener('click', () => fileInput.click());
        fileUpload.addEventListener('dragover', this.handleDragOver.bind(this));
        fileUpload.addEventListener('drop', this.handleDrop.bind(this));
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        uploadBtn.addEventListener('click', this.uploadFile.bind(this));
        }

        // PDF processing
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
        processBtn.addEventListener('click', this.processFile.bind(this));
        }

        // Chat
        const questionInput = document.getElementById('questionInput');
        const askBtn = document.getElementById('askBtn');

        if (questionInput && askBtn) {
        questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !askBtn.disabled) {
                this.askQuestion();
            }
        });
        askBtn.addEventListener('click', this.askQuestion.bind(this));
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.txt')) {
                this.handleFile(file);
            } else {
                this.showStatus('Chỉ hỗ trợ file PDF và TXT', 'error');
            }
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.txt')) {
                this.handleFile(file);
            } else {
                this.showStatus('Chỉ hỗ trợ file PDF và TXT', 'error');
                e.target.value = '';
            }
        }
    }

    handleFile(file) {
        const fileUpload = document.getElementById('fileUpload');
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (fileUpload && uploadBtn) {
        fileUpload.innerHTML = `
            <p><strong>${file.name}</strong></p>
            <p style="font-size: 0.9rem; color: #718096;">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        `;
        
        uploadBtn.disabled = false;
        this.selectedFile = file;
        }
    }

    async uploadFile() {
        if (!this.selectedFile) return;

        const uploadBtn = document.getElementById('uploadBtn');
        if (!uploadBtn) return;
        
            uploadBtn.disabled = true;
        this.showStatus('Đang tải lên...', 'info');

            const formData = new FormData();
                formData.append('pdf', this.selectedFile);

        try {
            const response = await fetch('/api/upload-pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            this.showStatus('Tải lên thành công!', 'success');
            this.loadPdfList();
            
            this.selectedPdf = result.filename;
            this.updatePdfSelection();
            
        } catch (error) {
            this.showStatus('Lỗi tải lên: ' + error.message, 'error');
        } finally {
            uploadBtn.disabled = false;
        }
    }

    async loadPdfList() {
        try {
            const response = await fetch('/api/pdfs');
            const data = await response.json();
            
            const pdfList = document.getElementById('pdfList');
            if (!pdfList) return;

            if (data.pdfs.length === 0) {
                pdfList.innerHTML = '<p>Chưa có file nào</p>';
                return;
            }

            pdfList.innerHTML = data.pdfs.map(pdf => 
                `<div class="pdf-item" data-filename="${pdf}">${pdf}</div>`
            ).join('');

                    pdfList.querySelectorAll('.pdf-item').forEach(item => {
                        item.addEventListener('click', () => {
                    this.selectedPdf = item.dataset.filename;
                    this.updatePdfSelection();
                        });
                    });

        } catch (error) {
            console.error('Error loading PDF list:', error);
        }
    }

    updatePdfSelection() {
        document.querySelectorAll('.pdf-item').forEach(item => {
            item.classList.remove('selected');
        });

        if (this.selectedPdf) {
            const selectedItem = document.querySelector(`[data-filename="${this.selectedPdf}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        }

        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.disabled = !this.selectedPdf;
        }
    }

    async processFile() {
        if (!this.selectedPdf) return;

        const processBtn = document.getElementById('processBtn');
        if (!processBtn) return;

        processBtn.disabled = true;
        this.showStatus('Đang xử lý file...', 'info');

        try {
            const response = await fetch('/api/process-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfPath: `./pdfs/${this.selectedPdf}` })
            });

            if (!response.ok) {
                throw new Error('Processing failed');
            }

            const result = await response.json();
            this.showStatus(`Xử lý thành công! ${result.chunks} chunks đã tạo.`, 'success');
            
            const questionInput = document.getElementById('questionInput');
            const askBtn = document.getElementById('askBtn');
            if (questionInput && askBtn) {
                questionInput.disabled = false;
                askBtn.disabled = false;
            }
            
        } catch (error) {
            this.showStatus('Lỗi xử lý: ' + error.message, 'error');
        } finally {
            processBtn.disabled = false;
        }
    }

    async askQuestion() {
        const questionInput = document.getElementById('questionInput');
        const askBtn = document.getElementById('askBtn');
        
        if (!questionInput || !askBtn) return;

        const question = questionInput.value.trim();
        if (!question) return;

        this.addMessage(question, 'user');
        questionInput.value = '';

        questionInput.disabled = true;
        askBtn.disabled = true;

        try {
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get answer');
            }

            const result = await response.json();
            this.addMessage(result.answer, 'bot');

        } catch (error) {
            this.addMessage('Xin lỗi, có lỗi xảy ra: ' + error.message, 'bot');
        } finally {
            questionInput.disabled = false;
            askBtn.disabled = false;
            questionInput.focus();
        }
    }

    addMessage(text, sender) {
        const messages = document.getElementById('chatMessages');
        if (!messages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        if (!status) return;

        status.innerHTML = `<div class="status ${type}">${message}</div>`;
        
        setTimeout(() => {
            status.innerHTML = '';
        }, 5000);
    }
}

// Global functions for Ngư Quán website
window.toggleChat = function() {
    const chatWidget = document.getElementById('chatWidget');
    if (chatWidget) {
        if (chatWidget.style.display === 'flex') {
            chatWidget.style.display = 'none';
        } else {
            chatWidget.style.display = 'flex';
        }
    }
};

window.sendMessage = async function() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    addMessage(message, 'user');
    input.value = '';
    
            try {
            console.log('Sending question:', message);
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: message
                })
            });

        if (response.ok) {
            const result = await response.json();
            console.log('API response:', result);
            addMessage(result.answer, 'bot');
        } else {
            console.log('API error:', response.status, response.statusText);
            // Fallback responses dựa trên từ khóa trong câu hỏi
            const questionLower = message.toLowerCase();
            let response = "";
            
            if (questionLower.includes('địa chỉ') || questionLower.includes('ở đâu') || questionLower.includes('cơ sở')) {
                response = "Nhà hàng chúng tôi có 2 cơ sở:\n- CS1: Số 51 Hoàng Quán Chi, Yên Hoà, Cầu Giấy, Hà Nội\n- CS2: Số 6 TT3, đường số 23, KĐT Thành phố Giao Lưu, Bắc Từ Liêm, Hà Nội";
            } else if (questionLower.includes('hotline') || questionLower.includes('số điện thoại') || questionLower.includes('liên hệ')) {
                response = "Bạn có thể liên hệ:\n- CS1: 0243.792.5356 - 0382.699.866\n- CS2: 0243.792.5355 - 0365.699.866";
            } else if (questionLower.includes('giá') || questionLower.includes('bao nhiêu') || questionLower.includes('tiền')) {
                response = "Món cá chình suối có giá 1.350.000đ. Chúng tôi có hơn 50 món ăn với giá cả hợp lý. Bạn có thể gọi hotline để biết thêm chi tiết.";
            } else if (questionLower.includes('giờ') || questionLower.includes('mở cửa') || questionLower.includes('thời gian')) {
                response = "Nhà hàng mở cửa buổi trưa và buổi tối. Bạn có thể gọi hotline để đặt bàn và biết giờ cụ thể.";
            } else if (questionLower.includes('đặt bàn') || questionLower.includes('đặt chỗ')) {
                response = "Bạn có thể đặt bàn qua hotline:\n- CS1: 0382 699 866\n- CS2: 0365 699 866\nHoặc đến trực tiếp nhà hàng.";
            } else if (questionLower.includes('món') || questionLower.includes('ăn') || questionLower.includes('thực đơn') || questionLower.includes('cá')) {
                response = "Chúng tôi chuyên về đặc sản cá sông, cá khủng và thịt thú rừng. Nổi bật có món cá chình suối giá 1.350.000đ. Có hơn 50 món ăn đa dạng.";
            } else {
                response = "Cảm ơn bạn đã quan tâm đến nhà hàng Ngư Quán! Chúng tôi chuyên về đặc sản cá sông với 2 cơ sở tại Hà Nội. Bạn có thể gọi hotline 0382 699 866 để được tư vấn chi tiết.";
            }
            
            setTimeout(() => addMessage(response, 'bot'), 1000);
        }
    } catch (error) {
        // Fallback responses khi có lỗi
        const questionLower = message.toLowerCase();
        let response = "";
        
        if (questionLower.includes('địa chỉ') || questionLower.includes('ở đâu') || questionLower.includes('cơ sở')) {
            response = "Nhà hàng chúng tôi có 2 cơ sở:\n- CS1: Số 51 Hoàng Quán Chi, Yên Hoà, Cầu Giấy, Hà Nội\n- CS2: Số 6 TT3, đường số 23, KĐT Thành phố Giao Lưu, Bắc Từ Liêm, Hà Nội";
        } else if (questionLower.includes('hotline') || questionLower.includes('số điện thoại') || questionLower.includes('liên hệ')) {
            response = "Bạn có thể liên hệ:\n- CS1: 0243.792.5356 - 0382.699.866\n- CS2: 0243.792.5355 - 0365.699.866";
        } else if (questionLower.includes('giá') || questionLower.includes('bao nhiêu') || questionLower.includes('tiền')) {
            response = "Món cá chình suối có giá 1.350.000đ. Chúng tôi có hơn 50 món ăn với giá cả hợp lý.";
        } else if (questionLower.includes('giờ') || questionLower.includes('mở cửa') || questionLower.includes('thời gian')) {
            response = "Nhà hàng mở cửa buổi trưa và buổi tối. Bạn có thể gọi hotline để đặt bàn.";
        } else if (questionLower.includes('đặt bàn') || questionLower.includes('đặt chỗ')) {
            response = "Bạn có thể đặt bàn qua hotline:\n- CS1: 0382 699 866\n- CS2: 0365 699 866";
        } else if (questionLower.includes('món') || questionLower.includes('ăn') || questionLower.includes('thực đơn')) {
            response = "Chúng tôi chuyên về đặc sản cá sông, cá khủng và thịt thú rừng. Nổi bật có món cá chình suối giá 1.350.000đ.";
        } else {
            response = "Cảm ơn bạn đã quan tâm đến nhà hàng Ngư Quán! Chúng tôi chuyên về đặc sản cá sông với 2 cơ sở tại Hà Nội. Bạn có thể gọi hotline 0382 699 866 để được tư vấn.";
        }
        
        setTimeout(() => addMessage(response, 'bot'), 1000);
    }
};

function addMessage(text, sender) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

window.scrollToSection = function(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth'
        });
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('fileUpload')) {
    new RAGSystem();
    }
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});
