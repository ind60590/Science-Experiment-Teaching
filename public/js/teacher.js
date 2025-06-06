// DOM 元素
const loginForm = document.getElementById('loginForm');
const teacherInterface = document.getElementById('teacherInterface');
const teacherLoginForm = document.getElementById('teacherLoginForm');
const newExperimentForm = document.getElementById('newExperimentForm');
const videoUploadForm = document.getElementById('videoUploadForm');
const experimentList = document.getElementById('experimentList');
const stepsContainer = document.getElementById('stepsContainer');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkLoginStatus();
    initializeSteps();
});

// 設置事件監聽器
function setupEventListeners() {
    if (teacherLoginForm) {
        teacherLoginForm.addEventListener('submit', handleLogin);
    }
    if (newExperimentForm) {
        newExperimentForm.addEventListener('submit', handleNewExperiment);
    }
    if (videoUploadForm) {
        videoUploadForm.addEventListener('submit', handleVideoUpload);
    }
}

// 初始化步驟
function initializeSteps() {
    // 清空步驟容器
    stepsContainer.innerHTML = '';
    // 添加三個預設步驟
    for (let i = 0; i < 3; i++) {
        addStep();
    }
}

// 添加新步驟
function addStep() {
    const stepCount = stepsContainer.children.length + 1;
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-item';
    stepDiv.innerHTML = `
        <span class="step-number">第 ${stepCount} 步驟：</span>
        <div class="step-content">
            <input type="text" class="form-control" name="step" required>
        </div>
        <div class="step-actions">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeStep(this)">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
    `;
    stepsContainer.appendChild(stepDiv);
    updateStepNumbers();
}

// 移除步驟
function removeStep(button) {
    const stepItem = button.closest('.step-item');
    stepItem.remove();
    updateStepNumbers();
}

// 更新步驟編號
function updateStepNumbers() {
    const steps = stepsContainer.getElementsByClassName('step-number');
    Array.from(steps).forEach((step, index) => {
        step.textContent = `第 ${index + 1} 步驟：`;
    });
}

// 檢查登入狀態
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('teacherLoggedIn') === 'true';
    if (isLoggedIn) {
        showTeacherInterface();
    }
}

// 處理登入
async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/teacher/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            localStorage.setItem('teacherLoggedIn', 'true');
            showTeacherInterface();
        } else {
            showError('密碼錯誤');
        }
    } catch (error) {
        console.error('登入失敗:', error);
        showError('登入失敗，請稍後再試');
    }
}

// 顯示教師介面
function showTeacherInterface() {
    loginForm.style.display = 'none';
    teacherInterface.style.display = 'block';
    loadExperiments();
}

// 處理新增實驗
async function handleNewExperiment(e) {
    e.preventDefault();
    const name = document.getElementById('experimentName').value;
    const materials = document.getElementById('experimentMaterials').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.startsWith('-') ? line.substring(1).trim() : line);

    const steps = [];
    const stepInputs = document.querySelectorAll('[id^="step"]');
    stepInputs.forEach((input, index) => {
        if  ((input.value || '').trim()) {
            steps.push({
                description: input.value.trim(),
                completed: false
            });
        }
    });

    try {
        const response = await fetch('/api/experiments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                materials,
                steps
            })
        });

        if (response.ok) {
            alert('實驗新增成功！');
            document.getElementById('newExperimentForm').reset();
            document.getElementById('stepsContainer').innerHTML = '';
            loadExperiments();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || '新增實驗失敗');
        }
    } catch (error) {
        console.error('新增實驗失敗:', error);
        alert(error.message || '新增實驗失敗，請稍後再試');
    }
}

// 處理影片上傳
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('請選擇影片檔案');
        return;
    }

    if (!file.type.startsWith('video/')) {
        alert('請上傳影片檔案');
        return;
    }

    // 顯示處理中訊息
    const processingMessage = document.createElement('div');
    processingMessage.className = 'alert alert-info position-fixed top-50 start-50 translate-middle';
    processingMessage.style.zIndex = '9999';
    processingMessage.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div>正在處理影片，請稍候...</div>
        </div>
    `;
    document.body.appendChild(processingMessage);   

    formData.append('video', file);

    try {
        const response = await fetch('/api/upload-video', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`上傳失敗: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
             // 移除處理中訊息
             processingMessage.remove();
            
             // 顯示完成訊息
             const successMessage = document.createElement('div');
             successMessage.className = 'alert alert-success position-fixed top-50 start-50 translate-middle';
             successMessage.style.zIndex = '9999';
             successMessage.innerHTML = `
                 <i class="ri-checkbox-circle-line me-2"></i>
                 影片處理完成！
             `;
             document.body.appendChild(successMessage);
             
             // 3秒後移除完成訊息
             setTimeout(() => successMessage.remove(), 3000);
             
            // 顯示 AI 生成內容
            const aiContent = document.getElementById('aiContent');
            const transcript = document.getElementById('transcript');
            const aiGeneratedContent = document.getElementById('aiGeneratedContent');
            
            // 顯示逐字稿
            transcript.textContent = data.experiment.transcript;
            
            // 格式化顯示內容
            aiContent.innerHTML = `
                <div class="mb-3">
                    <h5>實驗名稱：</h5>
                    <p>${data.experiment.name}</p>
                </div>
                <div class="mb-3">
                    <h5>實驗材料：</h5>
                    <p>${data.experiment.materials.join('<br>')}</p>
                </div>
                <div class="mb-3">
                    <h5>實驗步驟：</h5>
                    <ol>
                        ${data.experiment.steps.map(step => `
                            <li>${step.description}</li>
                        `).join('')}
                    </ol>
                </div>
            `;
            
            aiGeneratedContent.style.display = 'block';
            
            // 重新載入實驗列表
            loadExperiments();
        } else {
            // 移除處理中訊息
            processingMessage.remove();
            
            // 顯示錯誤訊息
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger position-fixed top-50 start-50 translate-middle';
            errorMessage.style.zIndex = '9999';
            errorMessage.innerHTML = `
                <i class="ri-error-warning-line me-2"></i>
                上傳失敗：${data.message}
            `;
            document.body.appendChild(errorMessage);
            
            // 3秒後移除錯誤訊息
            setTimeout(() => errorMessage.remove(), 3000);
        }
    } catch (error) {
        // 移除處理中訊息
        processingMessage.remove();
        
        console.error('上傳失敗:', error);
        alert('上傳失敗，請稍後再試');
    }
});

// 新增步驟
window.addStep = function() {
    const stepsContainer = document.getElementById('stepsContainer');
    const stepCount = stepsContainer.children.length + 1;
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-item';
    stepDiv.innerHTML = `
        <span class="step-number">第 ${stepCount} 步驟：</span>
        <div class="step-content">
            <input type="text" class="form-control" name="step" required>
        </div>
        <div class="step-actions">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeStep(this)">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
    `;
    stepsContainer.appendChild(stepDiv);
    updateStepNumbers();
};

// 移除步驟
window.removeStep = function(button) {
    const stepItem = button.closest('.step-item');
    stepItem.remove();
    updateStepNumbers();
};

// 套用 AI 生成內容
window.applyAiContent = function() {
    const aiContent = document.getElementById('aiContent');
    const experimentName = document.getElementById('experimentName');
    const experimentMaterials = document.getElementById('experimentMaterials');
    const stepsContainer = document.getElementById('stepsContainer');

    // 套用實驗名稱
    experimentName.value = aiContent.querySelector('h5:first-child + p').textContent;

    // 套用實驗材料
    function setExperimentMaterials(aiContent, experimentMaterials) {
    try {
        console.log('開始處理實驗材料...');
        
        // 嘗試多種選擇器
        let materialsElement = aiContent.querySelector('h5:nth-child(3) + p');
        
        // 如果第一個選擇器失敗，嘗試其他方法
        if (!materialsElement) {
            console.log('第一個選擇器失敗，嘗試其他方法...');
            const headers = aiContent.querySelectorAll('h5, h4, h6');
            for (let header of headers) {
                if (header.textContent.includes('材料') || header.textContent.includes('Material')) {
                    materialsElement = header.nextElementSibling;
                    break;
                }
            }
        }
        
        console.log('找到的材料元素:', materialsElement);
        
        if (materialsElement && materialsElement.textContent) {
            const rawText = materialsElement.textContent;
            console.log('材料原始內容:', rawText);
            
            const materials = rawText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && line !== '');
            
            console.log('處理後的材料陣列:', materials);
            
            const finalValue = materials.join('\n');
            experimentMaterials.value = finalValue;
            
            console.log('最終設定的值:', experimentMaterials.value);
            console.log('設定完成，textarea 實際值:', experimentMaterials.value);
            
        } else {
            console.warn('找不到材料元素或內容為空');
            experimentMaterials.value = '';
        }
        
    } catch (error) {
        console.error('處理材料時發生錯誤:', error);
        experimentMaterials.value = '';
    }
}

    // 套用實驗步驟
    stepsContainer.innerHTML = '';
    const steps = aiContent.querySelectorAll('ol li');
    steps.forEach((step, index) => {
        addStep();
        const stepInput = stepsContainer.querySelector(`#step${index}`);
        if (stepInput) {
            stepInput.value = step.textContent;
        }
    });
};

// 載入實驗列表
async function loadExperiments() {
    try {
        const response = await fetch('/api/experiments');
        const experiments = await response.json();
        
        // 按創建時間排序（最新的在前）
        experiments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        experimentList.innerHTML = '';
        experiments.forEach(exp => {
            const expDiv = document.createElement('div');
            expDiv.className = 'experiment-item';
            expDiv.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${exp.name}</h5>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="editExperiment('${exp.id}')">
                            <i class="ri-edit-line"></i> 編輯
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExperiment('${exp.id}')">
                            <i class="ri-delete-bin-line"></i> 刪除
                        </button>
                    </div>
                </div>
            `;
            experimentList.appendChild(expDiv);
        });
    } catch (error) {
        console.error('載入實驗列表失敗:', error);
        showNotification('無法載入實驗列表，請稍後再試', 'error');
    }
}

// 編輯實驗
async function editExperiment(id) {
    try {
        const response = await fetch(`/api/experiments/${id}`);
        const experiment = await response.json();
        
        document.getElementById('experimentName').value = experiment.name;
        // 清空現有步驟
        stepsContainer.innerHTML = '';
        // 添加實驗步驟
        experiment.steps.forEach(step => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-item';
            stepDiv.innerHTML = `
                <span class="step-number">第 ${stepsContainer.children.length + 1} 步驟：</span>
                <div class="step-content">
                    <input type="text" class="form-control" name="step" value="${step.description}" required>
                </div>
                <div class="step-actions">
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeStep(this)">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;
            stepsContainer.appendChild(stepDiv);
        });
        
        // 添加編輯模式標記
        newExperimentForm.dataset.editId = id;
        showNotification('已載入實驗內容，請進行編輯', 'success');
    } catch (error) {
        console.error('載入實驗詳情失敗:', error);
        showNotification('無法載入實驗詳情，請稍後再試', 'error');
    }
}

// 刪除實驗
async function deleteExperiment(id) {
    if (!confirm('確定要刪除此實驗嗎？')) return;

    try {
        const response = await fetch(`/api/experiments/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('實驗刪除成功！', 'success');
            loadExperiments();
        } else {
            showNotification('刪除實驗失敗', 'error');
        }
    } catch (error) {
        console.error('刪除實驗失敗:', error);
        showNotification('刪除實驗失敗，請稍後再試', 'error');
    }
}

// 顯示通知
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="ri-${type === 'success' ? 'checkbox-circle' : 'error-warning'}-line"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    // 3秒後移除通知
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 顯示錯誤訊息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.innerHTML = `
        <i class="ri-error-warning-line"></i> ${message}
    `;
    document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.row'));
    setTimeout(() => errorDiv.remove(), 3000);
}

// 教師頁面功能實現

// 實驗管理功能
function manageExperiments() {
    // TODO: 實現實驗管理功能
    alert('實驗管理功能即將推出！');
}

// 提問管理功能
function manageQuestions() {
    // TODO: 實現提問管理功能
    alert('提問管理功能即將推出！');
}

// 頁面載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    // 添加頁面載入動畫
    document.body.classList.add('loaded');
    
    // 初始化工具提示
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// 儲存實驗
async function saveExperiment() {
    // 檢查必要元素是否存在
    const nameInput = document.getElementById('experimentName');
    const materialsInput = document.getElementById('experimentMaterials');
    const stepsContainer = document.getElementById('stepsContainer');
    const newExperimentForm = document.getElementById('newExperimentForm');

    console.log('開始儲存實驗，檢查 DOM 元素:', {
        nameInput: !!nameInput,
        materialsInput: !!materialsInput,
        stepsContainer: !!stepsContainer,
        newExperimentForm: !!newExperimentForm
    });

    if (!nameInput || !materialsInput || !stepsContainer || !newExperimentForm) {
        console.error('找不到必要的 DOM 元素:', {
            nameInput: !!nameInput,
            materialsInput: !!materialsInput,
            stepsContainer: !!stepsContainer,
            newExperimentForm: !!newExperimentForm
        });
        alert('系統錯誤：找不到必要的表單元素');
        return;
    }

    const name = nameInput.value.trim();
    const materials = materialsInput.value;
    
    // 獲取所有步驟，使用更準確的選擇器
    const stepElements = stepsContainer.querySelectorAll('.step-item input[type="text"]');
    console.log('找到的步驟元素數量:', stepElements.length);
    console.log('步驟元素:', Array.from(stepElements).map(el => ({
        value: el.value,
        name: el.name,
        id: el.id
    })));
    
    const steps = Array.from(stepElements)
        .map(input => ({
            description: (input.value || '').trim(),
            completed: false
        }))
        .filter(step => step.description.length > 0);

    console.log('處理後的步驟:', steps);

    // 驗證輸入
    if (!name) {
        alert('請輸入實驗名稱');
        nameInput.focus();
        return;
    }

    if (!materials.trim()) {
        alert('請輸入實驗材料');
        materialsInput.focus();
        return;
    }

    if (steps.length === 0) {
        alert('請至少添加一個實驗步驟');
        return;
    }

    try {
        // 處理材料，確保沒有空字串
        const processedMaterials = materials
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const requestData = {
            name,
            materials: processedMaterials,
            steps
        };

        console.log('準備發送數據:', requestData);

        // 檢查是否為編輯模式
        const editId = newExperimentForm.dataset.editId;
        const url = editId ? `/api/experiments/${editId}` : '/api/experiments';
        const method = editId ? 'PUT' : 'POST';

        console.log('發送請求:', {
            url,
            method,
            editId,
            data: requestData
        });

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        console.log('收到回應:', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('伺服器回應錯誤:', errorData);
            throw new Error(errorData.message || '儲存失敗');
        }

        const result = await response.json();
        console.log('儲存成功，伺服器回應:', result);
        alert('實驗儲存成功！');
        
        // 清除編輯模式標記
        delete newExperimentForm.dataset.editId;
        
        // 重新載入實驗列表
        console.log('開始重新載入實驗列表');
        await loadExperiments();
        console.log('實驗列表重新載入完成');
        
        // 重置表單
        resetForm();
    } catch (error) {
        console.error('儲存實驗失敗:', error);
        alert(`儲存實驗失敗：${error.message || '請稍後再試'}`);
    }
}

// 重置表單
function resetForm() {
    document.getElementById('experimentName').value = '';
    document.getElementById('experimentMaterials').value = '';
    document.getElementById('stepsContainer').innerHTML = '';
    addStep(); // 添加一個空白步驟
} 