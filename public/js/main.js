// 全局變量
let currentExperiment = null;
let currentStep = 0;
let experimentSteps = [];

// DOM 元素
const experimentSelect = document.getElementById('experimentSelect');
const experimentStepsDiv = document.getElementById('experimentSteps');
const questionInput = document.getElementById('questionInput');
const askButton = document.getElementById('askButton');
const qaHistory = document.getElementById('qaHistory');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadExperiments();
    setupEventListeners();
});

// 載入實驗列表
async function loadExperiments() {
    try {
        const response = await fetch('/api/experiments');
        const experiments = await response.json();
        const select = document.getElementById('experimentSelect');
        select.innerHTML = '<option value="">請選擇實驗</option>';
        experiments.forEach(exp => {
            const option = document.createElement('option');
            option.value = exp.id;
            option.textContent = exp.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('載入實驗列表失敗:', error);
    }
}

// 設置事件監聽器
function setupEventListeners() {
    experimentSelect.addEventListener('change', handleExperimentSelect);
    askButton.addEventListener('click', handleQuestion);
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleQuestion();
    });
}

// 處理實驗選擇
async function handleExperimentSelect(e) {
    const experimentId = e.target.value;
    if (!experimentId) {
        experimentStepsDiv.innerHTML = '<p class="text-center text-muted">請先選擇一個實驗</p>';
        return;
    }

    try {
        const response = await fetch(`/api/experiments/${experimentId}`);
        const experiment = await response.json();
        
        currentExperiment = experiment;
        experimentSteps = experiment.steps;
        currentStep = 0;
        
        displayExperimentSteps();
    } catch (error) {
        console.error('載入實驗步驟失敗:', error);
        showError('無法載入實驗步驟，請稍後再試');
    }
}

// 選擇實驗
async function selectExperiment(experimentId) {
    try {
        const response = await fetch(`/api/experiments/${experimentId}`);
        if (!response.ok) {
            throw new Error('載入實驗失敗');
        }
        currentExperiment = await response.json();
        currentStep = 0;
        displayExperimentSteps();
    } catch (error) {
        console.error('載入實驗步驟失敗:', error);
        alert('載入實驗失敗，請稍後再試');
    }
}

// 顯示實驗步驟
function displayExperimentSteps() {
    const stepsContainer = document.getElementById('experimentSteps');
    const materialsContainer = document.getElementById('experimentMaterials');
    
    if (!currentExperiment) {
        stepsContainer.innerHTML = '<p class="text-center text-muted">請先選擇一個實驗</p>';
        materialsContainer.innerHTML = '';
        return;
    }

    // 顯示實驗步驟
    stepsContainer.innerHTML = currentExperiment.steps
        .map((step, index) => `
            <div class="step-item mb-3 ${index < currentStep ? 'completed' : ''}">
                <div class="d-flex align-items-center">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="step${index}" 
                            ${index < currentStep ? 'checked' : ''} 
                            ${index === currentStep ? '' : 'disabled'}
                            onchange="completeStep(${index})">
                        <label class="form-check-label" for="step${index}">
                            ${index + 1}. ${step.description}
                        </label>
                    </div>
                </div>
            </div>
        `)
        .join('');

    // 顯示實驗材料
    materialsContainer.innerHTML = currentExperiment.materials
        .map(material => `<li class="list-group-item">${material}</li>`)
        .join('');
}

// 完成步驟
async function completeStep(stepIndex) {
    if (stepIndex === currentStep) {
        try {
            const response = await fetch(`/api/experiments/${currentExperiment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...currentExperiment,
                    steps: currentExperiment.steps.map((step, index) => ({
                        ...step,
                        completed: index <= stepIndex
                    }))
                })
            });

            if (response.ok) {
                currentStep++;
                displayExperimentSteps();
                
                // 檢查是否完成所有步驟
                if (currentStep >= currentExperiment.steps.length) {
                    showCompletionMessage();
                }
            }
        } catch (error) {
            console.error('更新步驟狀態失敗:', error);
            alert('更新步驟狀態失敗，請稍後再試');
        }
    }
}

// 顯示完成訊息
function showCompletionMessage() {
    const stepsContainer = document.getElementById('experimentSteps');
    const message = document.createElement('div');
    message.className = 'alert alert-success mt-3';
    message.innerHTML = `
        <h4>恭喜！</h4>
        <p>你已經完成了所有實驗步驟！</p>
        <button class="btn btn-primary" onclick="exportToPDF()">
            <i class="ri-file-pdf-line"></i>
            下載實驗記錄
        </button>
    `;
    stepsContainer.appendChild(message);
}

// 處理提問
async function handleQuestion() {
    const questionInput = document.getElementById('questionInput');
    const question = questionInput.value.trim();
    const experimentId = document.getElementById('experimentSelect').value;
    const currentStep = document.querySelector('.step.active')?.textContent || '';

    if (!question) {
        alert('請輸入問題');
        return;
    }

    if (!experimentId) {
        alert('請先選擇實驗');
        return;
    }

    try {
        // 顯示載入狀態
        const askButton = document.getElementById('askButton');
        const originalText = askButton.innerHTML;
        askButton.disabled = true;
        askButton.innerHTML = '<i class="ri-loader-4-line"></i> 思考中...';

        const response = await fetch('/api/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question,
                experimentId,
                currentStep
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.text) {
            // 添加問題到歷史記錄
            addToHistory('question', question);
            // 添加回答到歷史記錄
            addToHistory('answer', data.text);
            // 清空輸入框
            questionInput.value = '';
        } else {
            throw new Error('未收到有效的回答');
        }
    } catch (error) {
        console.error('提問失敗:', error);
        // 添加錯誤訊息到歷史記錄
        addToHistory('error', '抱歉，我現在無法回答這個問題。請稍後再試。');
    } finally {
        // 恢復按鈕狀態
        const askButton = document.getElementById('askButton');
        askButton.disabled = false;
        askButton.innerHTML = '<i class="ri-send-plane-fill"></i> 提問';
    }
}

// 添加內容到歷史記錄
function addToHistory(type, text) {
    const history = document.getElementById('qaHistory');
    const item = document.createElement('div');
    item.className = `qa-item ${type}`;
    
    let icon, label;
    switch(type) {
        case 'question':
            icon = 'ri-question-line';
            label = '問：';
            break;
        case 'answer':
            icon = 'ri-chat-1-line';
            label = '答：';
            break;
        case 'error':
            icon = 'ri-error-warning-line';
            label = '系統：';
            break;
        default:
            icon = 'ri-information-line';
            label = '';
    }
    
    item.innerHTML = `
        <div class="d-flex align-items-start">
            <i class="ri-${icon} me-2"></i>
            <div>
                <strong>${label}</strong>
                <p class="mb-0">${text}</p>
            </div>
        </div>
    `;
    
    history.appendChild(item);
    history.scrollTop = history.scrollHeight;
}

// 匯出 PDF
async function exportToPDF() {
    try {
        const response = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                experimentId: currentExperiment.id,
                steps: currentExperiment.steps,
                qaHistory: [] // 如果需要，可以添加問答歷史
            })
        });

        if (response.ok) {
            // 創建 blob 並下載
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentExperiment.name}_實驗記錄.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('PDF 生成失敗');
        }
    } catch (error) {
        console.error('匯出 PDF 失敗:', error);
        alert('匯出 PDF 失敗，請稍後再試');
    }
}

// 顯示錯誤訊息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.row'));
    setTimeout(() => errorDiv.remove(), 5000);
} 