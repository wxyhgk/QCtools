// ================== Gaussian Log文件解析器 ==================

/**
 * Gaussian Log文件解析器
 * 用于解析Gaussian输出文件中的分子坐标和振动信息
 */
class GaussianLogParser {    constructor() {
        this.atomicNumbers = {
            1: 'H', 2: 'He', 3: 'Li', 4: 'Be', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 10: 'Ne',
            11: 'Na', 12: 'Mg', 13: 'Al', 14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 18: 'Ar',
            19: 'K', 20: 'Ca', 21: 'Sc', 22: 'Ti', 23: 'V', 24: 'Cr', 25: 'Mn', 26: 'Fe',
            27: 'Co', 28: 'Ni', 29: 'Cu', 30: 'Zn', 31: 'Ga', 32: 'Ge', 33: 'As', 34: 'Se',
            35: 'Br', 36: 'Kr', 37: 'Rb', 38: 'Sr', 39: 'Y', 40: 'Zr', 41: 'Nb', 42: 'Mo',
            43: 'Tc', 44: 'Ru', 45: 'Rh', 46: 'Pd', 47: 'Ag', 48: 'Cd', 49: 'In', 50: 'Sn',
            51: 'Sb', 52: 'Te', 53: 'I', 54: 'Xe', 55: 'Cs', 56: 'Ba', 57: 'La', 58: 'Ce',
            59: 'Pr', 60: 'Nd', 61: 'Pm', 62: 'Sm', 63: 'Eu', 64: 'Gd', 65: 'Tb', 66: 'Dy',
            67: 'Ho', 68: 'Er', 69: 'Tm', 70: 'Yb', 71: 'Lu', 72: 'Hf', 73: 'Ta', 74: 'W',
            75: 'Re', 76: 'Os', 77: 'Ir', 78: 'Pt', 79: 'Au', 80: 'Hg', 81: 'Tl', 82: 'Pb',
            83: 'Bi', 84: 'Po', 85: 'At', 86: 'Rn', 87: 'Fr', 88: 'Ra', 89: 'Ac', 90: 'Th',
            91: 'Pa', 92: 'U', 93: 'Np', 94: 'Pu', 95: 'Am', 96: 'Cm', 97: 'Bk', 98: 'Cf',
            99: 'Es', 100: 'Fm', 101: 'Md', 102: 'No', 103: 'Lr', 104: 'Rf', 105: 'Db',
            106: 'Sg', 107: 'Bh', 108: 'Hs', 109: 'Mt', 110: 'Ds', 111: 'Rg', 112: 'Cn',
            113: 'Nh', 114: 'Fl', 115: 'Mc', 116: 'Lv', 117: 'Ts', 118: 'Og'
        };
    }    /**
     * 解析整个log文件内容
     * @param {string} logContent - log文件的文本内容
     * @returns {Object} 解析结果
     */    parseLogFile(logContent) {
        try {
            const coordinates = this.extractFinalGeometry(logContent);
            const frequencies = this.extractFrequencies(logContent);
            const vibrationModes = this.extractVibrationModes(logContent);
            
            return {
                success: true,
                coordinates: coordinates,
                frequencies: frequencies,
                vibrationModes: vibrationModes,
                atomCount: coordinates ? coordinates.atoms.length : 0,
                modeCount: vibrationModes ? vibrationModes.length : 0
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }/**
     * 提取最终的几何结构（最后一次Standard orientation）
     * @param {string} content - log文件内容
     * @returns {Object} 分子几何结构
     */
    extractFinalGeometry(content) {
        const lines = content.split('\n');
        let lastOrientationStart = -1;

        // 找到最后一次"Standard orientation"的位置
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Standard orientation:')) {
                lastOrientationStart = i;
            }
        }

        if (lastOrientationStart === -1) {
            throw new Error('未找到Standard orientation部分');
        }

        // 解析坐标数据
        const atoms = [];
        let headerFound = false;
        let dataStarted = false;
        
        for (let i = lastOrientationStart; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 查找表头
            if (line.includes('Center') && line.includes('Atomic') && line.includes('Coordinates')) {
                headerFound = true;
                continue;
            }
            
            // 查找第一个分割线（表头下方）
            if (headerFound && line.includes('-----') && !dataStarted) {
                dataStarted = true;
                continue;
            }
            
            // 遇到第二个分割线时停止（数据结束）
            if (dataStarted && line.includes('-----')) {
                break;
            }
            
            // 解析原子数据
            if (dataStarted && line !== '') {
                const parts = line.split(/\s+/);
                
                // 确保行格式正确：Center Number, Atomic Number, Atomic Type, X, Y, Z
                if (parts.length >= 6) {
                    const centerNumber = parseInt(parts[0]);
                    const atomicNumber = parseInt(parts[1]);
                    const atomicType = parseInt(parts[2]); // 通常是0
                    const x = parseFloat(parts[3]);
                    const y = parseFloat(parts[4]);
                    const z = parseFloat(parts[5]);
                    
                    // 验证数据有效性
                    if (!isNaN(centerNumber) && !isNaN(atomicNumber) && 
                        !isNaN(x) && !isNaN(y) && !isNaN(z) && 
                        atomicNumber > 0 && atomicNumber <= 118) {
                        
                        const element = this.atomicNumbers[atomicNumber] || 'X';
                        
                        atoms.push({
                            index: centerNumber,
                            element: element,
                            atomicNumber: atomicNumber,
                            x: x,
                            y: y,
                            z: z
                        });
                    }
                }
            }
        }

        if (atoms.length === 0) {
            throw new Error('未找到有效的坐标数据');
        }

        // 提取原子坐标和元素信息
        return {
            atoms: atoms,
            atomCount: atoms.length
        };
    }

    /**
     * 提取振动频率
     * @param {string} content - log文件内容
     * @returns {Array} 频率数组
     */
    extractFrequencies(content) {
        const lines = content.split('\n');
        const frequencies = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 查找频率行
            if (line.includes('Frequencies --')) {
                const freqMatch = line.match(/Frequencies\s+--\s+([\d\.\-\s]+)/);
                if (freqMatch) {
                    const freqValues = freqMatch[1].trim().split(/\s+/)
                        .map(f => parseFloat(f))
                        .filter(f => !isNaN(f));
                    frequencies.push(...freqValues);
                }
            }
        }

        return frequencies;
    }    /**
     * 提取振动模式和位移向量
     * @param {string} content - log文件内容
     * @returns {Array} 振动模式数组
     */
    extractVibrationModes(content) {
        const lines = content.split('\n');
        const modes = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 查找频率行
            if (line.includes('Frequencies --')) {
                const freqMatch = line.match(/Frequencies\s+--\s+([\d\.\-\s]+)/);
                if (!freqMatch) continue;
                
                const frequencies = freqMatch[1].trim().split(/\s+/)
                    .map(f => parseFloat(f))
                    .filter(f => !isNaN(f) && f > 0); // 过滤掉虚频（负数）
                
                if (frequencies.length === 0) continue;
                
                // 为每个频率创建模式对象
                const currentModes = frequencies.map(freq => ({
                    frequency: freq,
                    displacements: []
                }));
                
                // 查找下面的位移向量表格
                let foundAtomHeader = false;
                
                for (let j = i + 1; j < Math.min(i + 100, lines.length); j++) {
                    const nextLine = lines[j].trim();
                    
                    // 查找"Atom  AN      X      Y      Z"开头的表头
                    if (nextLine.includes('Atom') && nextLine.includes('AN') && 
                        nextLine.includes('X') && nextLine.includes('Y') && nextLine.includes('Z')) {
                        foundAtomHeader = true;
                        
                        // 从下一行开始解析原子位移数据
                        for (let k = j + 1; k < lines.length; k++) {
                            const atomLine = lines[k].trim();
                            
                            // 遇到空行或新的频率块时停止
                            if (atomLine === '' || 
                                atomLine.includes('Frequencies --') || 
                                atomLine.includes('Red. masses') ||
                                atomLine.includes('Frc consts') ||
                                atomLine.includes('IR Inten') ||
                                atomLine.includes('---') ||
                                /^\s*\d+\s*$/.test(atomLine)) { // 单独的数字行（模式编号）
                                break;
                            }
                            
                            // 解析原子位移数据
                            const parts = atomLine.split(/\s+/);
                            if (parts.length >= 5) {
                                const atomIndex = parseInt(parts[0]);
                                const atomicNumber = parseInt(parts[1]);
                                
                                if (!isNaN(atomIndex) && !isNaN(atomicNumber) && atomicNumber > 0) {
                                    // 每行包含多个模式的XYZ坐标
                                    const dataStart = 2;
                                    const coordsPerMode = 3; // X, Y, Z
                                    const availableModes = Math.floor((parts.length - dataStart) / coordsPerMode);
                                    
                                    for (let modeIdx = 0; modeIdx < Math.min(availableModes, currentModes.length); modeIdx++) {
                                        const baseIdx = dataStart + modeIdx * coordsPerMode;
                                        
                                        if (baseIdx + 2 < parts.length) {
                                            const dx = parseFloat(parts[baseIdx]);
                                            const dy = parseFloat(parts[baseIdx + 1]);
                                            const dz = parseFloat(parts[baseIdx + 2]);
                                            
                                            if (!isNaN(dx) && !isNaN(dy) && !isNaN(dz)) {
                                                currentModes[modeIdx].displacements.push({
                                                    atomIndex: atomIndex,
                                                    element: this.atomicNumbers[atomicNumber] || 'X',
                                                    dx: dx,
                                                    dy: dy,
                                                    dz: dz
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    }
                    
                    // 如果遇到下一个Frequencies块，停止查找
                    if (nextLine.includes('Frequencies --')) {
                        break;
                    }
                }
                
                // 添加有效的模式到结果中
                currentModes.forEach((mode, idx) => {
                    if (mode.displacements.length > 0) {
                        // 找到振动模式数据
                        modes.push(mode);
                    }
                });
            }
        }
        
        // 振动模式解析完成
        return modes;
    }

    /**
     * 提取偶极矩信息
     * @param {string} content - log文件内容
     * @returns {Object} 偶极矩数据
     */    /**
     * 将坐标转换为XYZ格式
     * @param {Object} coordinates - 坐标数据
     * @param {string} title - 分子标题
     * @returns {string} XYZ格式的字符串
     */
    coordinatesToXYZ(coordinates, title = 'Molecule from Gaussian log') {
        if (!coordinates || !coordinates.atoms) {
            throw new Error('无效的坐标数据');
        }

        let xyzString = `${coordinates.atoms.length}\n`;
        xyzString += `${title}\n`;
        
        coordinates.atoms.forEach(atom => {
            xyzString += `${atom.element.padEnd(2)} ${atom.x.toFixed(6).padStart(12)} ${atom.y.toFixed(6).padStart(12)} ${atom.z.toFixed(6).padStart(12)}\n`;
        });

        return xyzString;
    }

    /**
     * 将振动模式转换为JSON格式
     * @param {Array} modes - 振动模式数组
     * @returns {string} JSON格式的字符串
     */
    modesToJSON(modes) {
        const jsonData = {
            modes: modes.map(mode => ({
                frequency: mode.frequency,
                displacements: mode.displacements.map(disp => ({
                    atomIndex: disp.atomIndex,
                    dx: disp.dx,
                    dy: disp.dy,
                    dz: disp.dz
                }))
            }))
        };

        return JSON.stringify(jsonData, null, 2);
    }

    /**
     * 完整解析并返回可用于应用的数据
     * @param {string} logContent - log文件内容
     * @returns {Object} 包含XYZ和JSON数据的对象
     */    parseForApp(logContent) {
        const result = this.parseLogFile(logContent);
        
        if (!result.success) {
            return result;
        }

        try {
            const xyzData = this.coordinatesToXYZ(result.coordinates);
            const jsonData = this.modesToJSON(result.vibrationModes);

            return {
                success: true,
                xyzData: xyzData,
                jsonData: jsonData,
                parsedData: result,
                summary: {
                    atomCount: result.atomCount,
                    modeCount: result.modeCount,
                    frequencies: result.frequencies
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 导出解析器类（如果在模块环境中使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GaussianLogParser;
}
