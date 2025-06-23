// ================== 分子显示模块 ==================
class MoleculeDisplay {    constructor(viewer) {
        this.viewer = viewer;
        this.model = null;
        this.originalCoordinates = [];
        this.labelsVisible = false;
        this.labelUpdateTimeout = null;
    }
    
    // 加载分子
    loadMolecule(xyzData) {
        try {
            this.viewer.removeAllModels();
            this.model = this.viewer.addModel(xyzData, "xyz");
            this.model.setStyle({}, {
                sphere: {radius: 0.3, colorscheme: 'Jmol'},
                stick: {radius: 0.15, colorscheme: 'Jmol'}
            });
            
            // 保存原始坐标
            const atoms = this.model.selectedAtoms({});
            this.originalCoordinates = atoms.map(atom => ({x: atom.x, y: atom.y, z: atom.z}));
            
            this.viewer.zoomTo();
            this.viewer.render();
            
            return {
                success: true,
                atomCount: atoms.length,
                atoms: atoms
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 显示/隐藏原子标签
    toggleAtomLabels() {
        if (!this.model) return false;
        
        if (this.labelsVisible) {
            this.hideAtomLabels();
        } else {
            this.showAtomLabels();
        }
        
        this.labelsVisible = !this.labelsVisible;
        return this.labelsVisible;
    }    // 显示原子标签
    showAtomLabels() {
        if (!this.model) return;
        
        const atoms = this.model.selectedAtoms({});
        
        // 清理之前的更新任务
        if (this.labelUpdateTimeout) {
            clearTimeout(this.labelUpdateTimeout);
            this.labelUpdateTimeout = null;
        }
        
        // 分批处理标签，避免一次性处理太多造成卡顿
        const batchSize = 20; // 增加批次大小，减少批次数量
        let currentIndex = 0;
        let renderScheduled = false;
        
        const processBatch = () => {
            const endIndex = Math.min(currentIndex + batchSize, atoms.length);
            
            for (let i = currentIndex; i < endIndex; i++) {
                const atom = atoms[i];
                this.viewer.addLabel(`${atom.elem}${i + 1}`, {
                    position: {x: atom.x, y: atom.y, z: atom.z},
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    fontColor: '#1d1d1f',
                    fontSize: 11,
                    borderThickness: 1,
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 3,
                    showBackground: true
                });
            }
            
            currentIndex = endIndex;
            
            if (currentIndex < atoms.length) {
                // 继续处理下一批，但不立即渲染
                requestAnimationFrame(processBatch);
            } else {
                // 所有标签处理完成，最后统一渲染
                if (!renderScheduled) {
                    renderScheduled = true;
                    requestAnimationFrame(() => {
                        this.viewer.render();
                    });
                }
            }
        };
        
        // 开始处理第一批
        processBatch();
    }
    
    // 隐藏原子标签
    hideAtomLabels() {
        if (!this.model) return;
        
        this.viewer.removeAllLabels();
        this.viewer.render();
    }
    
    // 获取原子数据
    getAtoms() {
        return this.model ? this.model.selectedAtoms({}) : [];
    }    // 重置到原始坐标
    resetToOriginal() {
        if (this.originalCoordinates.length > 0) {
            const restoreFrame = this.originalCoordinates.map(coord => [coord.x, coord.y, coord.z]);
            this.model.setCoordinates([restoreFrame], 'array');
            
            // 如果标签可见，使用防抖机制避免频繁更新
            if (this.labelsVisible) {
                // 取消之前的延迟更新
                if (this.labelUpdateTimeout) {
                    clearTimeout(this.labelUpdateTimeout);
                }
                
                // 延迟更新标签，避免频繁重绘
                this.labelUpdateTimeout = setTimeout(() => {
                    if (this.labelsVisible && this.model) {
                        this.viewer.removeAllLabels();
                        this.showAtomLabels();
                    }
                }, 50); // 50ms防抖延迟
            } else {
                this.viewer.render();
            }
        }
    }    // 清除分子
    clear() {
        // 清理定时器
        if (this.labelUpdateTimeout) {
            clearTimeout(this.labelUpdateTimeout);
            this.labelUpdateTimeout = null;
        }
        
        this.viewer.removeAllModels();
        this.viewer.removeAllLabels();
        this.model = null;
        this.originalCoordinates = [];
        this.labelsVisible = false;
        this.viewer.render();
    }
}

// ================== 向量显示模块 ==================
class VectorDisplay {
    constructor(viewer) {
        this.viewer = viewer;
        this.vectors = [];
        this.visible = false;
    }
    
    // 显示向量
    show(moleculeAtoms, vectorData, options = {}) {
        const {
            scale = 10,
            radius = 0.05,
            threshold = 0.01,
            headWidth = 2.0,
            headLength = 0.3,
            color = '#007aff'
        } = options;
        
        this.hide(); // 先清除现有向量
        
        vectorData.forEach(vector => {
            const atomIndex = vector.atom - 1;
            if (atomIndex >= 0 && atomIndex < moleculeAtoms.length) {
                const atom = moleculeAtoms[atomIndex];
                const magnitude = Math.sqrt(vector.x*vector.x + vector.y*vector.y + vector.z*vector.z);
                
                if (magnitude > threshold) {
                    const totalLength = magnitude * scale;
                    const mid = Math.max(0.1, Math.min(0.9, (totalLength - headLength) / totalLength));
                    
                    const arrow = this.viewer.addArrow({
                        start: {x: atom.x, y: atom.y, z: atom.z},
                        end: {
                            x: atom.x + vector.x * scale,
                            y: atom.y + vector.y * scale,
                            z: atom.z + vector.z * scale
                        },
                        radius: radius,
                        radiusRatio: headWidth,
                        mid: mid,
                        color: color
                    });
                    
                    this.vectors.push(arrow);
                }
            }
        });
        
        this.viewer.render();
        this.visible = true;
        
        return {
            count: this.vectors.length,
            visible: this.visible
        };
    }
    
    // 隐藏向量
    hide() {
        this.vectors.forEach(vector => this.viewer.removeShape(vector));
        this.vectors = [];
        this.viewer.render();
        this.visible = false;
    }
    
    // 切换显示
    toggle(moleculeAtoms, vectorData, options) {
        if (this.visible) {
            this.hide();
            return false;
        } else {
            this.show(moleculeAtoms, vectorData, options);
            return true;
        }
    }
}

// ================== 振动控制模块 ==================
class VibrationController {
    constructor(viewer, moleculeDisplay) {
        this.viewer = viewer;
        this.moleculeDisplay = moleculeDisplay;
        this.isPlaying = false;
        this.frames = [];
    }
    
    // 生成振动帧
    generateFrames(vectorData, options = {}) {
        const {
            amplitude = 0.5,
            numFrames = 20
        } = options;
        
        const originalCoords = this.moleculeDisplay.originalCoordinates;
        if (!originalCoords.length || !vectorData.length) {
            return false;
        }
        
        this.frames = [];
        
        for (let frame = 0; frame < numFrames; frame++) {
            const frameCoords = [];
            const phase = (frame / numFrames) * 2 * Math.PI;
            const displacement = Math.sin(phase) * amplitude;
            
            originalCoords.forEach((coord, atomIndex) => {
                let newX = coord.x;
                let newY = coord.y;
                let newZ = coord.z;
                
                const vectorInfo = vectorData.find(v => v.atom === atomIndex + 1);
                if (vectorInfo) {
                    newX += vectorInfo.x * displacement;
                    newY += vectorInfo.y * displacement;
                    newZ += vectorInfo.z * displacement;
                }
                
                frameCoords.push([newX, newY, newZ]);
            });
            
            this.frames.push(frameCoords);
        }
        
        return true;
    }
    
    // 开始振动
    start(vectorData, options = {}) {
        const {
            amplitude = 0.5,
            numFrames = 20,
            speed = 50
        } = options;
        
        if (this.isPlaying) return false;
        
        const success = this.generateFrames(vectorData, {amplitude, numFrames});
        if (!success) return false;
        
        this.moleculeDisplay.model.setCoordinates(this.frames, 'array');
        this.viewer.animate({loop: "forward", reps: 0, interval: speed});
        
        this.isPlaying = true;
        return true;
    }
    
    // 停止振动
    stop() {
        if (!this.isPlaying) return false;
        
        this.viewer.pauseAnimate();
        this.moleculeDisplay.resetToOriginal();
        this.isPlaying = false;
        return true;
    }
    
    // 切换振动
    toggle(vectorData, options) {
        if (this.isPlaying) {
            this.stop();
            return false;
        } else {
            this.start(vectorData, options);
            return true;
        }
    }
}
