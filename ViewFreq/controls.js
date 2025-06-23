// ================== 控制功能 ==================

// 切换向量显示
function toggleVectors() {
    if (!currentMode) return;
    
    const vectorBtn = document.getElementById('vectorBtn');
    if (!vectorBtn) return;
    
    const options = getVectorOptions();
    const showing = vectorDisplay.toggle(moleculeDisplay.getAtoms(), currentMode.vectors, options);
    
    vectorBtn.textContent = showing ? '隐藏向量' : '显示向量';
}

// 切换振动
function toggleVibration() {
    if (!currentMode) return;
    
    const playBtn = document.getElementById('playBtn');
    const vibrationBtn = document.getElementById('vibrationSettingsBtn');
    
    if (!playBtn || !vibrationBtn) return;
    
    const options = getVibrationOptions();
    const playing = vibrationController.toggle(currentMode.vectors, options);
    
    if (playing) {
        playBtn.textContent = '停止振动';
        playBtn.className = 'btn btn-danger';
        vibrationBtn.classList.add('playing');
    } else {
        playBtn.textContent = '播放振动';
        playBtn.className = 'btn btn-success';
        vibrationBtn.classList.remove('playing');
    }
}

// ================== 参数获取 ==================
function getVectorOptions() {
    return {
        scale: parseFloat(document.getElementById('scaleInput').value),
        radius: parseFloat(document.getElementById('radiusInput').value),
        threshold: parseFloat(document.getElementById('thresholdInput').value),
        headWidth: parseFloat(document.getElementById('headWidthInput').value),
        headLength: parseFloat(document.getElementById('headLengthInput').value),
        color: document.getElementById('colorPicker').value
    };
}

function getVibrationOptions() {
    return {
        amplitude: parseFloat(document.getElementById('amplitudeInput').value),
        speed: parseInt(document.getElementById('speedInput').value),
        numFrames: parseInt(document.getElementById('framesInput').value)
    };
}

// ================== 更新功能 ==================
function updateVectors() {
    if (vectorDisplay.visible && currentMode) {
        const options = getVectorOptions();
        vectorDisplay.show(moleculeDisplay.getAtoms(), currentMode.vectors, options);
    }
}

function updateVibration() {
    if (vibrationController.isPlaying) {
        vibrationController.stop();
        setTimeout(() => {
            const options = getVibrationOptions();
            vibrationController.start(currentMode.vectors, options);
        }, 100);
    }
}

// ================== 面板控制 ==================
function openVectorPanel() {
    if (document.getElementById('vectorSettingsBtn').classList.contains('disabled')) return;
    closeAllPanels();
    document.getElementById('vectorPanel').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function openVibrationPanel() {
    if (document.getElementById('vibrationSettingsBtn').classList.contains('disabled')) return;
    closeAllPanels();
    document.getElementById('vibrationPanel').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function closePanel(panelId) {
    document.getElementById(panelId).classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

function closeAllPanels() {
    const panels = document.querySelectorAll('.slide-panel');
    panels.forEach(panel => panel.classList.remove('open'));
    document.getElementById('overlay').classList.remove('show');
}

function closePanels() {
    closeAllPanels();
}

// ================== Log文件处理 ==================

// 处理Log文件上传
function handleLogUpload() {
    const file = document.getElementById('logFile').files[0];
    if (!file) return;
    
    // 显示加载状态
    document.getElementById('logText').textContent = '正在解析...';
    document.getElementById('logUpload').style.opacity = '0.7';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // 调用loadLogDataToApp处理log内容
            loadLogDataToApp(e.target.result);
            
            // 更新UI指示器
            document.getElementById('logIndicator').classList.add('success');
            document.getElementById('logText').textContent = file.name;
            document.getElementById('logText').classList.add('success');
            document.getElementById('logUpload').classList.add('success');
            
        } catch (error) {
            alert('解析log文件失败: ' + error.message);
            document.getElementById('logText').textContent = '解析失败，请重试';
        } finally {
            // 恢复UI状态
            document.getElementById('logUpload').style.opacity = '1';
        }
    };
    
    reader.onerror = function() {
        alert('文件读取失败');
        document.getElementById('logText').textContent = '读取失败，请重试';
        document.getElementById('logUpload').style.opacity = '1';
    };
    
    reader.readAsText(file);
}

// 从解析结果加载数据到应用
function loadLogDataToApp(logContent) {
    const parser = new GaussianLogParser();
    const result = parser.parseForApp(logContent);

    if (!result.success) {
        alert('解析log文件失败: ' + result.error);
        return;
    }

    // 设置分子数据
    moleculeData = result.xyzData;
    xyzLoaded = true;

    // 解析振动模式数据
    try {
        vibrationModes = JSON.parse(result.jsonData).modes.map(mode => ({
            frequency: mode.frequency,
            vectors: mode.displacements.map(disp => ({
                atom: disp.atomIndex,
                x: disp.dx,
                y: disp.dy,
                z: disp.dz
            }))
        }));
        modesLoaded = true;
    } catch (error) {
        alert('处理振动模式数据失败: ' + error.message);
        return;
    }    // 更新UI
    if (typeof updateUI === 'function') {
        updateUI();
    }
    
    // 自动加载到视图
    const loadResult = moleculeDisplay.loadMolecule(moleculeData);
    if (!loadResult.success) {
        alert('加载分子结构失败: ' + loadResult.error);
        return;
    }

    // 在模型加载完成后再次更新UI以启用控制按钮
    if (typeof updateUI === 'function') {
        updateUI();
    }
      // 启用原子标签按钮（不依赖振动模式）
    const atomLabelsBtn = document.getElementById('atomLabelsBtn');
    if (atomLabelsBtn) {
        atomLabelsBtn.disabled = false;
    }

    // 填充模式选择器
    if (typeof populateModeSelector === 'function') {
        populateModeSelector(vibrationModes);
    }

    // 显示成功信息
    let successMessage = `成功解析log文件！\n原子数: ${result.summary.atomCount}\n振动模式数: ${result.summary.modeCount}`;
    
    alert(successMessage);

    // 自动选择第一个振动模式并播放
    if (vibrationModes && vibrationModes.length > 0) {
        // 选择第一个模式
        const modeSelector = document.getElementById('modeSelector');
        if (modeSelector) {
            modeSelector.value = '0';
            
            // 触发模式选择
            if (typeof selectMode === 'function') {
                selectMode();
            }
            
            // 自动显示向量
            setTimeout(() => {
                const vectorBtn = document.getElementById('vectorBtn');
                if (vectorBtn && !vectorBtn.disabled) {
                    toggleVectors();
                }
            }, 300);
            
            // 自动开始播放振动
            setTimeout(() => {
                const playBtn = document.getElementById('playBtn');
                if (playBtn && !playBtn.disabled) {
                    toggleVibration();
                }
            }, 500);
        }
    }
}

// ================== 原子标签控制 ==================
function toggleAtomLabels() {
    if (!moleculeDisplay.model) {
        alert('请先加载分子结构');
        return;
    }
    
    const button = document.getElementById('atomLabelsBtn');
    const atoms = moleculeDisplay.model.selectedAtoms({});
    const atomCount = atoms.length;
    
    // 立即显示加载状态，给用户反馈
    button.style.opacity = '0.6';
    button.disabled = true;
    button.style.transform = 'scale(0.95)';
    
    // 根据原子数量显示不同的提示
    if (atomCount > 50) {
        button.innerHTML = '⏳'; // 沙漏表示处理中
        button.title = `处理 ${atomCount} 个原子标签中...`;
    } else {
        button.innerHTML = '💫'; // 闪光表示快速处理
    }
    
    // 清理可能存在的标签更新任务，避免冲突
    if (moleculeDisplay.labelUpdateTimeout) {
        clearTimeout(moleculeDisplay.labelUpdateTimeout);
        moleculeDisplay.labelUpdateTimeout = null;
    }
    
    // 使用很短的延迟让UI立即响应
    setTimeout(() => {
        const isVisible = moleculeDisplay.toggleAtomLabels();
        
        // 处理完成后更新按钮状态
        if (isVisible) {
            button.classList.add('active');
            button.title = '隐藏原子标签';
            button.innerHTML = '🏷️';
        } else {
            button.classList.remove('active');
            button.title = '显示原子标签';
            button.innerHTML = '🏷️';
        }
        
        // 恢复按钮状态，添加成功反馈动画
        button.style.opacity = '1';
        button.style.transform = 'scale(1)';
        button.disabled = false;
        
        // 添加一个短暂的"完成"反馈动画
        button.style.transform = 'scale(1.1)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 120);
        
    }, atomCount > 30 ? 8 : 3); // 根据原子数量调整延迟
}

// ================== 示例加载 ==================
function loadExample() {
    moleculeData = `3
Water molecule
O  0.000000  0.000000  0.000000
H  0.757000  0.587000  0.000000
H -0.757000  0.587000  0.000000`;

    vibrationModes = [
        {
            frequency: 1642.31,
            vectors: [
                {atom: 1, x: 0.000, y: -0.042, z: 0.000},
                {atom: 2, x: 0.397, y: 0.529, z: 0.000},
                {atom: 3, x: -0.397, y: 0.529, z: 0.000}
            ]
        },
        {
            frequency: 3756.89,
            vectors: [
                {atom: 1, x: 0.000, y: 0.000, z: 0.000},
                {atom: 2, x: 0.702, y: -0.312, z: 0.000},
                {atom: 3, x: 0.000, y: 0.000, z: 0.000}
            ]
        },
        {
            frequency: 3870.42,
            vectors: [
                {atom: 1, x: 0.000, y: 0.000, z: 0.000},
                {atom: 2, x: 0.000, y: 0.000, z: 0.000},
                {atom: 3, x: 0.702, y: -0.312, z: 0.000}
            ]
        }
    ];    xyzLoaded = true;
    modesLoaded = true;

    const modeSelectionContainer = document.getElementById('modeSelectionContainer');
    if (modeSelectionContainer) {
        modeSelectionContainer.style.display = 'block';
    }
    
    if (typeof updateUI === 'function') {
        updateUI();
    }

    try {
        const result = moleculeDisplay.loadMolecule(moleculeData);

        if (typeof populateModeSelector === 'function') {
            populateModeSelector(vibrationModes);
        }

        if (vibrationModes && vibrationModes.length > 0) {
            const modeSelector = document.getElementById('modeSelector');
            if (modeSelector) {
                modeSelector.value = '0';
                if (typeof selectMode === 'function') {
                    selectMode();
                }
            }
        }
    } catch (error) {
        alert("加载失败: " + error.message);
    }
}

// ================== 事件监听 ==================
// ESC键关闭面板
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllPanels();
    }
});
