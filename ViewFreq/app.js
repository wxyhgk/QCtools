// ================== 全局变量 ==================
let viewer;
let moleculeDisplay;
let vectorDisplay;
let vibrationController;
let moleculeData = null;
let vibrationModes = null;
let currentMode = null;
let xyzLoaded = false;
let modesLoaded = false;

// ================== 初始化 ==================
function init() {
    try {
        console.log('初始化3DMol查看器...');
        viewer = $3Dmol.createViewer("molecule-viewer", {
            backgroundColor: '#fafafa'
        });
        
        if (!viewer) {
            console.error('创建查看器失败');
            alert('3DMol查看器初始化失败，请检查控制台获取更多信息');
            return;
        }
        
        console.log('设置视图...');
        viewer.setView([0, 0, 0, 20, 0, 0, 0, 1]);
        viewer.render();        console.log('初始化模块...');
        moleculeDisplay = new MoleculeDisplay(viewer);
        vectorDisplay = new VectorDisplay(viewer);
        vibrationController = new VibrationController(viewer, moleculeDisplay);
        
        console.log('初始化完成');
    } catch (error) {
        console.error('初始化时出错:', error);
        alert('初始化失败: ' + error.message);
    }
}

// ================== 文件处理 ==================
function handleXYZUpload() {
    const file = document.getElementById('xyzFile').files[0];
    if (!file) return;
      const reader = new FileReader();
    reader.onload = function(e) {
        moleculeData = e.target.result;
        xyzLoaded = true;
        updateUI();
        
        // xyz上传区域已被移除，不再更新UI元素
        console.log('XYZ文件加载成功:', file.name);
    };
    reader.readAsText(file);
}

function handleVectorUpload() {
    const file = document.getElementById('vectorFile').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {        try {
            vibrationModes = parseVectorData(e.target.result);
            modesLoaded = true;
            updateUI();
            
            // vector上传区域已被移除，不再更新UI元素
            console.log('振动模式文件加载成功:', `${vibrationModes.length} 个振动模式`);
            
            populateModeSelector(vibrationModes);
        } catch (error) {
            alert('振动模式文件格式错误: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ================== 数据解析 ==================
function parseVectorData(content) {
    try {
        const data = JSON.parse(content);
        
        if (!data.modes || !Array.isArray(data.modes) || data.modes.length === 0) {
            throw new Error("未找到有效的振动模式数据");
        }
        
        const modes = data.modes.map((mode, index) => {
            if (!mode.frequency || !mode.displacements || !Array.isArray(mode.displacements)) {
                throw new Error(`振动模式 ${index + 1} 格式不正确`);
            }
            
            const vectors = mode.displacements.map(disp => ({
                atom: disp.atomIndex,
                x: disp.dx,
                y: disp.dy,
                z: disp.dz
            }));
            
            return {
                frequency: mode.frequency,
                vectors: vectors
            };
        });
        
        return modes;
    } catch (error) {
        if (error.name === "SyntaxError") {
            throw new Error("JSON格式不正确");
        }
        throw error;
    }
}

// ================== UI更新 ==================
function populateModeSelector(modes) {
    const selector = document.getElementById('modeSelector');
    const modeSelectionContainer = document.getElementById('modeSelectionContainer');
    
    if (!selector) {
        console.warn('Mode selector element not found');
        return;
    }
    
    while (selector.options.length > 1) {
        selector.remove(1);
    }
    
    modes.forEach((mode, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = `模式 ${index + 1}: ${mode.frequency.toFixed(2)} cm⁻¹`;
        selector.add(option);
    });
    
    if (modeSelectionContainer) {
        modeSelectionContainer.style.display = 'block';
    }
}

function selectMode() {
    const selector = document.getElementById('modeSelector');
    const frequencyValue = document.getElementById('frequencyValue');
    
    if (!selector) {
        console.warn('Mode selector element not found');
        return;
    }
    
    const selectedIndex = selector.value;
    
    if (selectedIndex !== "") {
        currentMode = vibrationModes[parseInt(selectedIndex)];
        
        if (frequencyValue) {
            frequencyValue.textContent = currentMode.frequency.toFixed(2);
        }
          if (moleculeDisplay && moleculeDisplay.model) {
            // 只有在有振动模式数据时才启用这些按钮
            const vectorBtn = document.getElementById('vectorBtn');
            const playBtn = document.getElementById('playBtn');
            
            if (vectorBtn) {
                vectorBtn.disabled = false;
            }
            if (playBtn) {
                playBtn.disabled = false;
            }
        }
        
        // 优化：在更新向量和振动之前，暂时隐藏标签避免重复渲染
        const labelsWereVisible = moleculeDisplay.labelsVisible;
        if (labelsWereVisible) {
            moleculeDisplay.hideAtomLabels();
        }
        
        if (vectorDisplay.visible) {
            updateVectors();
        }
        
        if (vibrationController.isPlaying) {
            toggleVibration();
            toggleVibration();
        }
        
        // 如果之前标签是显示的，延迟恢复显示，避免与其他渲染冲突
        if (labelsWereVisible) {
            setTimeout(() => {
                if (moleculeDisplay.model && !moleculeDisplay.labelsVisible) {
                    moleculeDisplay.showAtomLabels();
                    moleculeDisplay.labelsVisible = true;
                }
            }, 100);
        }
    } else {
        // 没有选择模式时，清除当前模式并禁用相关功能
        currentMode = null;
        document.getElementById('frequencyValue').textContent = "--";
        document.getElementById('vectorBtn').disabled = true;
        document.getElementById('playBtn').disabled = true;
        
        // 如果向量正在显示，隐藏它们
        if (vectorDisplay.visible) {
            vectorDisplay.hide();
        }
        
        // 如果振动正在播放，停止它
        if (vibrationController.isPlaying) {
            vibrationController.stop();
        }
    }
}

function updateUI() {
    const loadBtn = document.getElementById('loadBtn');
    const vectorSettingsBtn = document.getElementById('vectorSettingsBtn');
    const vibrationSettingsBtn = document.getElementById('vibrationSettingsBtn');
    const modeSelectionContainer = document.getElementById('modeSelectionContainer');
    const atomLabelsBtn = document.getElementById('atomLabelsBtn');
    
    // 安全检查：确保元素存在
    if (loadBtn) {
        loadBtn.disabled = !(xyzLoaded && modesLoaded);
    }
    
    if (moleculeDisplay && moleculeDisplay.model) {
        // 启用原子标签按钮（不依赖振动模式）
        if (atomLabelsBtn) {
            atomLabelsBtn.disabled = false;
        }
        
        // 只有在有振动模式数据时才启用振动相关控制
        if (vibrationModes && vibrationModes.length > 0) {
            if (vectorSettingsBtn) {
                vectorSettingsBtn.classList.remove('disabled');
            }
            if (vibrationSettingsBtn) {
                vibrationSettingsBtn.classList.remove('disabled');
            }
            if (modeSelectionContainer) {
                modeSelectionContainer.style.display = 'block';
            }
            
            // 根据是否选择了模式来决定按钮状态
            const vectorBtn = document.getElementById('vectorBtn');
            const playBtn = document.getElementById('playBtn');
            if (vectorBtn) {
                vectorBtn.disabled = !currentMode;
            }
            if (playBtn) {
                playBtn.disabled = !currentMode;
            }
        } else {
            // 没有振动模式时，禁用所有振动相关控制
            if (vectorSettingsBtn) {
                vectorSettingsBtn.classList.add('disabled');
            }
            if (vibrationSettingsBtn) {
                vibrationSettingsBtn.classList.add('disabled');
            }
            if (modeSelectionContainer) {
                modeSelectionContainer.style.display = 'none';
            }
            const vectorBtn = document.getElementById('vectorBtn');
            const playBtn = document.getElementById('playBtn');
            if (vectorBtn) {
                vectorBtn.disabled = true;
            }
            if (playBtn) {
                playBtn.disabled = true;
            }
        }
    } else {
        // 没有分子模型时，禁用所有控制
        if (atomLabelsBtn) {
            atomLabelsBtn.disabled = true;
        }
        if (vectorSettingsBtn) {
            vectorSettingsBtn.classList.add('disabled');
        }
        if (vibrationSettingsBtn) {
            vibrationSettingsBtn.classList.add('disabled');        }
        if (modeSelectionContainer) {
            modeSelectionContainer.style.display = 'none';
        }
        const vectorBtn = document.getElementById('vectorBtn');
        const playBtn = document.getElementById('playBtn');
        if (vectorBtn) {
            vectorBtn.disabled = true;
        }
        if (playBtn) {
            playBtn.disabled = true;
        }
    }
}

// ================== 数据加载 ==================
function loadData() {
    if (!moleculeData) {
        alert('请先上传分子坐标数据');
        return;
    }
    
    if (!vibrationModes) {
        alert('请先上传振动向量数据');
        return;
    }
    
    const result = moleculeDisplay.loadMolecule(moleculeData);
    if (!result.success) {
        alert('加载分子结构失败: ' + result.error);
        return;
    }
    
    updateUI();
    
    if (currentMode) {
        document.getElementById('vectorBtn').disabled = false;
        document.getElementById('playBtn').disabled = false;
    }
    
    const atomCount = result.atomCount;
    const modeCount = vibrationModes.length;
    alert(`成功加载分子结构 (${atomCount} 个原子) 和 ${modeCount} 个振动模式。\n\n请在下方选择要显示的振动模式。`);
    
    if (!currentMode && document.getElementById('modeSelector').value === "") {
        document.getElementById('modeSelector').focus();
    }
}

// 页面加载后初始化
window.addEventListener('load', init);
