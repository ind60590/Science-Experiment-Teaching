// DOM 元素
const loginForm = document.getElementById('loginForm');
const teacherInterface = document.getElementById('teacherInterface');
const teacherLoginForm = document.getElementById('teacherLoginForm');
const newExperimentForm = document.getElementById('newExperimentForm');
const experimentList = document.getElementById('experimentList');
// 確保 stepsContainer 被正確引用
const stepsContainer = document.getElementById('stepsContainer');

// 防止重複提交的標記
let isSubmitting = false;
let isLoggedIn = false; // 新增登入狀態追蹤

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('--- DOMContentLoaded 觸發 ---');
    console.log('1. DOM 載入完成，開始初始化');
    setupEventListeners();
    checkLoginStatus();
});

// 設置事件監聽器
function setupEventListeners() {
    console.log('2. 設置事件監聽器');

    if (teacherLoginForm) {
        teacherLoginForm.addEventListener('submit', handleLogin);
        console.log('2.1 登入表單事件監聽器已設置');
    }

    if (newExperimentForm) {
        newExperimentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('2.2 新增實驗表單提交');
            await saveExperiment();
        });
        console.log('2.3 新增實驗表單事件監聽器已設置');
    }

    // 處理影片上傳表單
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleVideoUpload);
        console.log('2.4 影片上傳表單事件監聽器已設置');
    }
}

// 檢查登入狀態
function checkLoginStatus() {
    console.log('3. 檢查登入狀態');
    isLoggedIn = localStorage.getItem('teacherLoggedIn') === 'true'; // 從 localStorage 獲取狀態
    if (isLoggedIn) {
        console.log('3.1 偵測到已登入狀態，顯示教師介面');
        showTeacherInterface();
        // 確保 initializeSteps 在 DOM 渲染完成後再執行
        // 使用 setTimeout 確保 DOM 渲染完成，避免在極端情況下 stepsContainer 為 null
        setTimeout(() => {
            console.log('3.1.1 setTimeout 觸發 initializeSteps (來自 checkLoginStatus)');
            initializeSteps();
        }, 100); // 短暫延遲，讓瀏覽器有時間渲染DOM
    } else {
        console.log('3.2 未登入，顯示登入表單');
        if (loginForm) loginForm.style.display = 'block';
        if (teacherInterface) teacherInterface.style.display = 'none';
    }
}

// 處理登入
async function handleLogin(e) {
    e.preventDefault();
    console.log('4. 處理登入請求');

    if (isLoggedIn) {
        console.log('4.1 已經登入，忽略重複請求');
        return;
    }

    const password = document.getElementById('password').value;
    console.log('4.2 密碼輸入:', password ? '已輸入' : '未輸入');

    if (password && password.trim() === '0000') {
        isLoggedIn = true;
        localStorage.setItem('teacherLoggedIn', 'true'); // 設置登入狀態到 localStorage
        console.log('4.3 登入成功，準備顯示教師介面');
        showTeacherInterface();
        // 登入成功後也立即初始化步驟
        setTimeout(() => {
            console.log('4.3.1 登入後 setTimeout 觸發 initializeSteps (來自 handleLogin)');
            initializeSteps();
        }, 100);
    } else {
        showError('密碼錯誤，請重新輸入');
        console.log('4.4 登入失敗：密碼錯誤');
    }
}

// 顯示教師介面
function showTeacherInterface() {
    console.log('5. 顯示教師介面');

    if (loginForm) {
        loginForm.style.display = 'none';
        console.log('5.1 隱藏登入表單');
    }

    if (teacherInterface) {
        teacherInterface.style.display = 'block';
        console.log('5.2 顯示教師介面區塊');
    }

    // 載入實驗列表
    loadExperiments();
    console.log('5.3 載入實驗列表');

    // 這裡不再直接呼叫 initializeSteps，因為 setTimeout 會處理，避免重複
    // initializeSteps();
}

// 初始化步驟
function initializeSteps() {
    console.log('6. 初始化步驟函數被調用');
    const container = document.getElementById('stepsContainer');

    if (!container) {
        console.error('6.1 stepsContainer 不存在，可能 DOM 還未準備好。延遲重試...');
        setTimeout(initializeSteps, 300); // 稍微延遲後重試，直到找到容器
        return;
    }

    console.log('6.2 找到 stepsContainer，當前子元素數量 (清空前):', container.children.length);

    // 清空現有內容，這是確保從一個乾淨狀態開始的關鍵
    container.innerHTML = '';
    console.log('6.3 清空步驟容器完成');

    // 添加三個預設空白步驟
    for (let i = 0; i < 3; i++) {
        console.log(`6.4 準備添加第 ${i + 1} 個預設步驟`);
        addStep(); // addStep 函數會自動增加步驟編號
    }

    console.log('6.5 步驟初始化完成，最終步驟數:', container.children.length);
}

// 添加新步驟
window.addStep = function() { // Make it global as onclick uses it
    console.log('7. addStep 函數被調用');
    const container = document.getElementById('stepsContainer');
    if (!container) {
        console.error('7.1 無法找到 stepsContainer，無法添加步驟');
        return;
    }

    const stepCount = container.children.length + 1;
    const stepDiv = document.createElement('div');
    stepDiv.className = 'mb-2 step-item d-flex align-items-center';
    stepDiv.innerHTML = `
        <div class="flex-grow-1">
            <div class="input-group">
                <span class="input-group-text">第 ${stepCount} 步</span>
                <input type="text" class="form-control" name="step" placeholder="請輸入實驗步驟" required>
            </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeStep(this)">
            <i class="ri-delete-bin-line"></i>
        </button>
    `;
    container.appendChild(stepDiv);
    updateStepNumbers();
    console.log(`7.2 步驟 ${stepCount} 添加完成`);
}

// 移除步驟
window.removeStep = function(button) { // Make it global
    console.log('8. 移除步驟函數被調用');
    const stepItem = button.closest('.step-item');
    if (stepItem) {
        stepItem.remove();
        updateStepNumbers();
        console.log('8.1 步驟移除完成');
    }
}

// 更新步驟編號
function updateStepNumbers() {
    console.log('9. 更新步驟編號函數被調用');
    const container = document.getElementById('stepsContainer');
    if (!container) {
        console.error('9.1 無法找到 stepsContainer，無法更新編號');
        return;
    }

    const stepItems = container.querySelectorAll('.step-item');
    stepItems.forEach((item, index) => {
        const stepText = item.querySelector('.input-group-text');
        if (stepText) {
            stepText.textContent = `第 ${index + 1} 步`;
        }
    });
    console.log('9.2 步驟編號更新完成');
}

// 處理影片上傳 (保持不變，與問題一無關)
async function handleVideoUpload(e) {
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
            const errorData = await response.json().catch(() => ({ message: '伺服器錯誤' }));
            throw new Error(`上傳失敗: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
            processingMessage.remove();

            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success position-fixed top-50 start-50 translate-middle';
            successMessage.style.zIndex = '9999';
            successMessage.innerHTML = `
                <i class="ri-checkbox-circle-line me-2"></i>
                影片處理完成！
            `;
            document.body.appendChild(successMessage);

            setTimeout(() => successMessage.remove(), 3000);
            displayAiGeneratedContent(data);
            loadExperiments();
        } else {
            processingMessage.remove();
            showError('上傳失敗：' + data.message);
        }
    } catch (error) {
        processingMessage.remove();
        console.error('上傳失敗:', error);
        alert('上傳失敗，請稍後再試：' + error.message);
    }
}

// 顯示 AI 生成內容
function displayAiGeneratedContent(data) {
    const aiContent = document.getElementById('aiContent');
    const transcript = document.getElementById('transcript');
    const aiGeneratedContent = document.getElementById('aiGeneratedContent');

    if (transcript && data.experiment.transcript) {
        transcript.textContent = data.experiment.transcript;
    }

    if (aiContent && data.experiment) {
        aiContent.innerHTML = `
            <div class="mb-3">
                <h5>實驗名稱：</h5>
                <p>${data.experiment.name || '未指定'}</p>
            </div>
            <div class="mb-3">
                <h5>實驗材料：</h5>
                <p>${(data.experiment.materials || []).join('<br>')}</p>
            </div>
            <div class="mb-3">
                <h5>實驗步驟：</h5>
                <ol>
                    ${(data.experiment.steps || []).map(step => `<li>${typeof step === 'string' ? step : step.description}</li>`).join('')}
                </ol>
            </div>
        `;
    }

    if (aiGeneratedContent) aiGeneratedContent.style.display = 'block';
}

// 套用 AI 生成內容
window.applyAiContent = function() {
    console.log('套用 AI 生成內容');
    const aiContent = document.getElementById('aiContent');
    const experimentName = document.getElementById('experimentName');
    const experimentMaterials = document.getElementById('experimentMaterials');
    const container = document.getElementById('stepsContainer');

    if (!aiContent || !experimentName || !experimentMaterials || !container) {
        console.error('找不到必要的 DOM 元素');
        return;
    }

    const nameElement = aiContent.querySelector('h5:first-child + p');
    if (nameElement && nameElement.textContent && nameElement.textContent !== '未指定') {
        experimentName.value = nameElement.textContent.trim();
    }

    setExperimentMaterials(aiContent, experimentMaterials);

    container.innerHTML = '';
    const steps = aiContent.querySelectorAll('ol li');
    if (steps.length > 0) {
        steps.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'mb-2 step-item d-flex align-items-center';
            stepDiv.innerHTML = `
                <div class="flex-grow-1">
                    <div class="input-group">
                        <span class="input-group-text">第 ${index + 1} 步</span>
                        <input type="text" class="form-control" name="step" value="${step.textContent.trim()}" required>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeStep(this)">
                    <i class="ri-delete-bin-line"></i>
                </button>
            `;
            container.appendChild(stepDiv);
        });
    } else {
        for (let i = 0; i < 3; i++) {
            addStep();
        }
    }
    updateStepNumbers();
    showNotification('AI 生成內容已套用', 'success');
};

// 設定實驗材料
function setExperimentMaterials(aiContent, experimentMaterials) {
    try {
        let materialsElement = aiContent.querySelector('h5:nth-of-type(2) + p');

        if (!materialsElement) {
            const headers = aiContent.querySelectorAll('h5, h4, h6');
            for (let header of headers) {
                if (header.textContent.includes('材料') || header.textContent.includes('Material')) {
                    materialsElement = header.nextElementSibling;
                    break;
                }
            }
        }

        if (materialsElement && materialsElement.textContent) {
            const rawText = materialsElement.textContent;
            const materials = rawText
                .split('<br>')
                .join('\n')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && line !== '');

            const finalValue = materials.join('\n');
            experimentMaterials.value = finalValue;
        } else {
            experimentMaterials.value = '';
        }

    } catch (error) {
        console.error('處理材料時發生錯誤:', error);
        experimentMaterials.value = '';
    }
}

// 載入實驗列表
async function loadExperiments() {
    if (!experimentList) return;

    try {
        const response = await fetch('/api/experiments');
        const experiments = await response.json();

        if (Array.isArray(experiments)) {
            experiments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }

        experimentList.innerHTML = '';

        if (Array.isArray(experiments) && experiments.length > 0) {
            experiments.forEach(exp => {
                const expDiv = document.createElement('div');
                expDiv.className = 'list-group-item d-flex justify-content-between align-items-center';
                expDiv.innerHTML = `
                    <div>
                        <h6 class="mb-0">${exp.name}</h6>
                        <small class="text-muted">${exp.materials ? exp.materials.length : 0} 項材料, ${exp.steps ? exp.steps.length : 0} 個步驟</small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="editExperiment('${exp.id}')">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExperiment('${exp.id}')">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                `;
                experimentList.appendChild(expDiv);
            });
        } else {
            experimentList.innerHTML = '<div class="text-center text-muted py-3">尚無實驗記錄</div>';
        }
    } catch (error) {
        console.error('載入實驗列表失敗:', error);
        experimentList.innerHTML = '<div class="text-center text-danger py-3">載入失敗，請稍後再試</div>';
    }
}

// 編輯實驗
window.editExperiment = async function(id) {
    try {
        const response = await fetch(`/api/experiments/${id}`);
        const experiment = await response.json();

        const nameInput = document.getElementById('experimentName');
        const materialsInput = document.getElementById('experimentMaterials');
        const container = document.getElementById('stepsContainer');

        if (nameInput) nameInput.value = experiment.name || '';
        if (materialsInput) materialsInput.value = (experiment.materials || []).join('\n');

        if (container) {
            container.innerHTML = ''; // 清空現有步驟
            const steps = experiment.steps || [];
            if (steps.length > 0) {
                steps.forEach((step, index) => {
                    const stepDiv = document.createElement('div');
                    stepDiv.className = 'mb-2 step-item d-flex align-items-center';
                    stepDiv.innerHTML = `
                        <div class="flex-grow-1">
                            <div class="input-group">
                                <span class="input-group-text">第 ${index + 1} 步</span>
                                <input type="text" class="form-control" name="step" value="${typeof step === 'string' ? step : step.description}" required>
                            </div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeStep(this)">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    `;
                    container.appendChild(stepDiv);
                });
            } else {
                // 如果實驗沒有步驟，則添加三個預設空白步驟
                for (let i = 0; i < 3; i++) {
                    addStep();
                }
            }
            updateStepNumbers(); // 確保編輯後步驟編號正確
        }

        if (newExperimentForm) {
            newExperimentForm.dataset.editId = id;
        }
        showNotification('已載入實驗內容，請進行編輯', 'success');
    } catch (error) {
        console.error('載入實驗詳情失敗:', error);
        showNotification('無法載入實驗詳情，請稍後再試', 'error');
    }
};

// 刪除實驗
window.deleteExperiment = async function(id) {
    if (!confirm('確定要刪除此實驗嗎？')) return;

    try {
        const response = await fetch(`/api/experiments/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('實驗刪除成功！', 'success');
            loadExperiments();
        } else {
            const errorData = await response.json().catch(() => ({ message: '伺服器錯誤' }));
            showNotification(`刪除實驗失敗: ${errorData.message || response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('刪除實驗失敗:', error);
        showNotification('刪除實驗失敗，請稍後再試', 'error');
    }
};

// 顯示通知
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="ri-${type === 'success' ? 'checkbox-circle' : 'error-warning'}-line me-2"></i>
        ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.style.opacity = '1', 10);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 顯示錯誤訊息
function showError(message) {
    showNotification(message, 'error');
}

// 儲存實驗
async function saveExperiment() {
    console.log('=== 開始儲存實驗流程 ===');

    if (isSubmitting) {
        console.log('正在提交中，忽略重複請求');
        return;
    }

    isSubmitting = true;

    try {
        const nameInput = document.getElementById('experimentName');
        const materialsInput = document.getElementById('experimentMaterials');
        const container = document.getElementById('stepsContainer');
        const form = document.getElementById('newExperimentForm');

        console.log('儲存流程 - DOM 元素檢查:', {
            nameInput: !!nameInput,
            materialsInput: !!materialsInput,
            stepsContainer: !!container,
            form: !!form
        });

        if (!nameInput || !materialsInput || !container || !form) {
            throw new Error('找不到必要的 DOM 元素');
        }

        const submitButtons = form.querySelectorAll('button[type="submit"]');
        submitButtons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line"></i> 儲存中...';
        });

        const name = nameInput.value.trim();
        const materials = materialsInput.value.trim();

        console.log('儲存流程 - 表單基本數據:', { name, materials });

        const stepInputs = container.querySelectorAll('input[name="step"]');
        console.log('儲存流程 - 找到步驟輸入框:', stepInputs.length);

        const steps = [];
        stepInputs.forEach((input, index) => {
            const description = input.value.trim();
            console.log(`儲存流程 - 步驟 ${index + 1}: "${description}"`);
            if (description) {
                steps.push({
                    description: description,
                    completed: false
                });
            }
        });

        console.log('儲存流程 - 處理後的步驟數據:', steps);

        if (!name) {
            throw new Error('請輸入實驗名稱');
        }

        if (!materials) {
            throw new Error('請輸入實驗材料');
        }

        if (steps.length === 0) {
            throw new Error('請至少添加一個實驗步驟');
        }

        const processedMaterials = materials
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        console.log('儲存流程 - 處理後的材料:', processedMaterials);

        const requestData = {
            name,
            materials: processedMaterials,
            steps
        };

        console.log('儲存流程 - 準備發送的完整數據:', JSON.stringify(requestData, null, 2));

        const editId = form.dataset.editId;
        const url = editId ? `/api/experiments/${editId}` : '/api/experiments';
        const method = editId ? 'PUT' : 'POST';

        console.log('儲存流程 - 請求設定:', { url, method, editId });

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        let result = {};
        try {
            result = await response.clone().json();
        } catch (jsonError) {
            console.warn('儲存流程 - 回應非 JSON 格式或解析失敗，但仍檢查 response.ok:', jsonError);
        }

        if (!response.ok) {
            throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('儲存流程 - 儲存成功，伺服器回應:', result);

        showNotification(editId ? '實驗更新成功！' : '實驗新增成功！', 'success');

        delete form.dataset.editId;

        await loadExperiments();

        resetForm();

        console.log('=== 儲存流程完成 ===');

    } catch (error) {
        console.error('儲存實驗失敗:', error);
        showNotification(`儲存實驗失敗：${error.message || '未知錯誤'}`, 'error');
    } finally {
        isSubmitting = false;
        const form = document.getElementById('newExperimentForm');
        if (form) {
            const submitButtons = form.querySelectorAll('button[type="submit"]');
            submitButtons.forEach(btn => {
                btn.disabled = false;
                btn.innerHTML = '<i class="ri-save-line"></i> 儲存實驗';
            });
        }
    }
}

// 重置表單
function resetForm() {
    console.log('10. 重置表單函數被調用');
    const nameInput = document.getElementById('experimentName');
    const materialsInput = document.getElementById('experimentMaterials');

    if (nameInput) {
        nameInput.value = '';
        console.log('10.1 清空實驗名稱輸入框');
    }
    if (materialsInput) {
        materialsInput.value = '';
        console.log('10.2 清空實驗材料輸入框');
    }

    // 關鍵：直接呼叫 initializeSteps 來重新生成三個預設步驟
    initializeSteps();
    console.log('10.3 表單重置完成，預設步驟已重新初始化');
}