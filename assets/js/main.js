const bmiForm = document.getElementById('bmi-form');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultCard = document.getElementById('result');
const resultTitle = document.getElementById('result-title');
const resultSubtitle = document.getElementById('result-subtitle');
const resultBmi = document.getElementById('result-bmi');
const resultAdvice = document.getElementById('result-advice');
const resultIdeal = document.getElementById('result-ideal');
const progressFill = document.getElementById('result-progress');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const yearEl = document.getElementById('year');
const resetBtn = document.getElementById('reset-btn');

const STORAGE_KEY = 'bmi-history';
const MAX_HISTORY = 8;

const categoryMap = [
    { max: 18.5, label: '偏瘦', advice: '注意营养摄入，增加优质蛋白质和复合碳水，保持规律作息。' },
    { max: 24, label: '正常', advice: '保持良好生活习惯，坚持适量运动，继续保持当前状态。' },
    { max: 28, label: '超重', advice: '控制总热量摄入，减少精制糖分，多进行中低强度有氧运动。' },
    { max: Infinity, label: '肥胖', advice: '建议在专业人士指导下制定减重计划，关注血压、血糖等指标。' }
];

const unitSwitchers = document.querySelectorAll('input[name="unit"]');
const metricFields = document.querySelectorAll('[data-unit="metric"]');
const imperialFields = document.querySelectorAll('[data-unit="imperial"]');

const parseFloatSafe = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

function toggleUnit(unit) {
    const isMetric = unit === 'metric';

    metricFields.forEach((el) => {
        el.hidden = !isMetric;
        el.querySelectorAll('input').forEach((input) => {
            input.required = isMetric;
            if (!isMetric) {
                input.value = '';
            }
        });
    });

    imperialFields.forEach((el) => {
        el.hidden = isMetric;
        el.querySelectorAll('input').forEach((input) => {
            input.required = !isMetric;
            if (isMetric) {
                input.value = '';
            }
        });
    });
}

function getCategory(bmi) {
    return categoryMap.find((item) => bmi < item.max);
}

function calculateMetric(heightCm, weightKg) {
    const heightM = heightCm / 100;
    if (heightM <= 0) return null;
    return weightKg / (heightM ** 2);
}

function calculateImperial(feet, inches, weightLb) {
    const totalInches = feet * 12 + inches;
    if (totalInches <= 0) return null;
    const heightM = totalInches * 0.0254;
    const weightKg = weightLb * 0.45359237;
    return calculateMetric(heightM * 100, weightKg);
}

function getIdealWeightRange(heightCm) {
    const heightM = heightCm / 100;
    const min = 18.5 * heightM ** 2;
    const max = 23.9 * heightM ** 2;
    return [min, max];
}

function formatNumber(num) {
    return Number(num).toFixed(1);
}

function setResult({
    bmi,
    category,
    advice,
    name,
    age,
    gender,
    heightCm,
    weightKg,
}) {
    const bmiText = formatNumber(bmi);
    resultBmi.textContent = bmiText;

    const subtitleParts = [];
    if (name) subtitleParts.push(`${name}`);
    if (age) subtitleParts.push(`${age} 岁`);
    if (gender === 'male') subtitleParts.push('男性');
    if (gender === 'female') subtitleParts.push('女性');
    resultSubtitle.textContent = subtitleParts.join(' · ') || '未填写额外信息';

    resultTitle.textContent = `你的 BMI 属于：${category}`;
    resultAdvice.textContent = advice;

    const [min, max] = getIdealWeightRange(heightCm);
    resultIdeal.textContent = `${formatNumber(min)} kg - ${formatNumber(max)} kg`;

    const progressPercent = Math.min(100, Math.max(0, (bmi / 35) * 100));
    progressFill.style.width = `${progressPercent}%`;

    resultPlaceholder.hidden = true;
    resultCard.hidden = false;
}

function storeHistory(entry) {
    const history = loadHistory();
    history.unshift(entry);
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    renderHistory();
}

function loadHistory() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('读取历史记录失败：', error);
        return [];
    }
}

function renderHistory() {
    const history = loadHistory();

    if (!history.length) {
        historyEmpty.hidden = false;
        historyList.hidden = true;
        historyList.innerHTML = '';
        return;
    }

    historyEmpty.hidden = true;
    historyList.hidden = false;
    historyList.innerHTML = '';

    history.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'history__item';
        li.dataset.index = index;
        li.innerHTML = `
            <div>
                <div><strong>${item.name || '匿名用户'}</strong> · BMI ${formatNumber(item.bmi)} (${item.category})</div>
                <div class="history__meta">${item.timestamp}</div>
            </div>
            <div>${formatNumber(item.weightKg)} kg · ${Math.round(item.heightCm)} cm</div>
        `;
        historyList.append(li);
    });
}

function fillFormFromHistory(index) {
    const history = loadHistory();
    const record = history[index];
    if (!record) return;

    toggleUnit('metric');
    unitSwitchers.forEach((switcher) => {
        switcher.checked = switcher.value === 'metric';
    });

    bmiForm.height.value = record.heightCm;
    bmiForm.weight.value = record.weightKg;
    bmiForm.name.value = record.name;
    bmiForm.age.value = record.age;
    bmiForm.gender.value = record.gender;
}

function validateInputs(formData) {
    const unit = formData.get('unit');
    if (unit === 'metric') {
        const height = parseFloatSafe(formData.get('height'));
        const weight = parseFloatSafe(formData.get('weight'));
        if (!height || !weight || height <= 0 || weight <= 0) {
            throw new Error('请输入有效的身高和体重。');
        }
        if (height < 80 || height > 250) {
            throw new Error('身高超出常见范围，请重新检查。');
        }
        if (weight < 20 || weight > 300) {
            throw new Error('体重超出常见范围，请重新检查。');
        }
        return {
            heightCm: height,
            weightKg: weight,
        };
    }

    const feet = parseFloatSafe(formData.get('heightFeet'));
    const inches = parseFloatSafe(formData.get('heightInches')) || 0;
    const weightLbs = parseFloatSafe(formData.get('weightLbs'));

    if (!feet || feet <= 0 || inches < 0 || !weightLbs || weightLbs <= 0) {
        throw new Error('请输入有效的身高和体重。');
    }

    if (feet < 3 || feet > 8) {
        throw new Error('身高超出常见范围，请重新检查。');
    }
    if (weightLbs < 44 || weightLbs > 660) {
        throw new Error('体重超出常见范围，请重新检查。');
    }

    const bmi = calculateImperial(feet, inches, weightLbs);
    const heightCm = (feet * 12 + inches) * 2.54;
    const weightKg = weightLbs * 0.45359237;

    return { heightCm, weightKg, bmiOverride: bmi };
}

function showError(message) {
    resultPlaceholder.hidden = false;
    resultCard.hidden = true;
    resultPlaceholder.innerHTML = `<p style="color:#ef4444;">${message}</p>`;
}

bmiForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(bmiForm);

    try {
        const { heightCm, weightKg, bmiOverride } = validateInputs(formData);
        const bmi = bmiOverride ?? calculateMetric(heightCm, weightKg);
        if (!bmi || !Number.isFinite(bmi)) {
            throw new Error('无法计算 BMI，请检查输入值。');
        }

        const { label, advice } = getCategory(bmi);
        const entry = {
            name: formData.get('name')?.trim() || '',
            age: formData.get('age')?.trim() || '',
            gender: formData.get('gender') || '',
            heightCm,
            weightKg,
            bmi,
            category: label,
            advice,
            timestamp: new Date().toLocaleString(),
        };

        setResult(entry);
        storeHistory(entry);
    } catch (error) {
        showError(error.message);
    }
});

unitSwitchers.forEach((switcher) => {
    switcher.addEventListener('change', (event) => {
        toggleUnit(event.target.value);
    });
});

historyList.addEventListener('click', (event) => {
    const li = event.target.closest('li');
    if (!li) return;
    const index = Number(li.dataset.index);
    fillFormFromHistory(index);
});

resetBtn.addEventListener('click', () => {
    resultPlaceholder.hidden = false;
    resultPlaceholder.innerHTML = '<p>填写信息并点击“计算 BMI”按钮，即可在此查看结果。</p>';
    resultCard.hidden = true;
});

window.addEventListener('DOMContentLoaded', () => {
    yearEl.textContent = new Date().getFullYear();
    renderHistory();
});
