/**
 * 自定义颜色选择器实现
 * 支持HSV颜色空间、透明度控制、预设颜色以及定位功能
 */

class ColorPicker {
    constructor(options) {
        this.options = Object.assign({
            // 默认选项
            containerId: null,            // 容器ID
            buttonId: null,               // 按钮ID (可选)
            popupId: null,                // 弹出框ID
            saturationId: null,           // 饱和度/明度控制区域ID
            hueId: null,                  // 色相控制区域ID
            alphaId: null,                // 透明度控制区域ID
            hexInputId: null,             // HEX输入框ID
            alphaInputId: null,           // 透明度输入框ID
            currentPreviewId: null,       // 当前颜色预览区域ID
            previousPreviewId: null,      // 之前颜色预览区域ID
            swatchesId: null,             // 预设颜色ID
            applyButtonId: null,          // 应用按钮ID
            cancelButtonId: null,         // 取消按钮ID
            initialColor: '#FF0000',      // 初始颜色
            onChange: null,               // 颜色变化回调
            onOpen: null,                 // 打开回调
            onClose: null,                // 关闭回调
            position: 'right',            // 弹出位置：right, left, bottom, top
            presetColors: [               // 预设颜色
                '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', 
                '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff', 
                '#ff00ff', '#ff0080', '#ffffff', '#cccccc', '#999999', 
                '#666666', '#333333', '#000000'
            ]
        }, options);

        // 验证必要的元素是否存在
        if (!this.options.containerId || !this.options.popupId) {
            console.error('颜色选择器初始化失败：缺少必要的元素ID');
            return;
        }

        // 初始化DOM元素引用
        this.container = document.getElementById(this.options.containerId);
        this.popup = document.getElementById(this.options.popupId);
        this.saturation = document.getElementById(this.options.saturationId);
        this.hue = document.getElementById(this.options.hueId);
        this.alpha = document.getElementById(this.options.alphaId);
        this.hexInput = document.getElementById(this.options.hexInputId);
        this.alphaInput = document.getElementById(this.options.alphaInputId);
        this.currentPreview = document.getElementById(this.options.currentPreviewId);
        this.previousPreview = document.getElementById(this.options.previousPreviewId);
        this.swatches = document.getElementById(this.options.swatchesId);
        this.applyButton = document.getElementById(this.options.applyButtonId);
        this.cancelButton = document.getElementById(this.options.cancelButtonId);
        
        // 按钮是可选的
        if (this.options.buttonId) {
            this.button = document.getElementById(this.options.buttonId);
        }
        
        // 初始化指针元素
        this.saturationPointer = this.saturation.querySelector('.color-picker-saturation-pointer');
        this.hueSlider = this.hue.querySelector('.color-picker-hue-slider');
        this.alphaSlider = this.alpha.querySelector('.color-picker-alpha-slider');
        this.alphaGradient = this.alpha.querySelector('.color-picker-alpha-gradient');

        // 初始化颜色状态
        this.colorHSVA = this.hexToHSVA(this.options.initialColor);
        this.previousColor = this.options.initialColor;
        
        // 记录拖动状态
        this.dragging = {
            saturation: false,
            hue: false,
            alpha: false
        };

        // 初始化
        this.init();
    }

    init() {
        // 设置按钮初始颜色（如果有按钮的话）
        if (this.button) {
            this.updateButtonColor();
        }
        
        // 创建预设颜色
        this.createColorSwatches();
        
        // 绑定事件
        this.bindEvents();
        
        // 更新UI
        this.updateUI();

        // 只在有按钮的情况下初始化定位弹出框
        // 对于无按钮的情况(如渐变节点选择器)，位置由外部代码控制
        if (this.button) {
            this.positionPopup();
        }
    }

    // 绑定事件
    bindEvents() {
        // 按钮点击事件（如果有按钮的话）
        if (this.button) {
            this.button.addEventListener('click', (e) => {
                this.togglePicker();
                e.stopPropagation();
            });
        }

        // 饱和度区域交互
        this.saturation.addEventListener('mousedown', (e) => {
            this.dragging.saturation = true;
            this.updateSaturationPosition(e);
            document.addEventListener('mousemove', this.handleSaturationMouseMove);
            document.addEventListener('mouseup', this.handleSaturationMouseUp);
            e.preventDefault();
        });

        // 色相滑块交互
        this.hue.addEventListener('mousedown', (e) => {
            this.dragging.hue = true;
            this.updateHuePosition(e);
            document.addEventListener('mousemove', this.handleHueMouseMove);
            document.addEventListener('mouseup', this.handleHueMouseUp);
            e.preventDefault();
        });

        // 透明度滑块交互
        this.alpha.addEventListener('mousedown', (e) => {
            this.dragging.alpha = true;
            this.updateAlphaPosition(e);
            document.addEventListener('mousemove', this.handleAlphaMouseMove);
            document.addEventListener('mouseup', this.handleAlphaMouseUp);
            e.preventDefault();
        });

        // HEX输入框变化
        this.hexInput.addEventListener('change', () => {
            const hex = this.hexInput.value;
            if (this.isValidHex(hex)) {
                this.colorHSVA = this.hexToHSVA(hex);
                this.updateUI();
                this.emitOnChange();
            }
        });

        // 透明度输入框变化
        this.alphaInput.addEventListener('change', () => {
            const alpha = parseInt(this.alphaInput.value) / 100;
            if (alpha >= 0 && alpha <= 1) {
                this.colorHSVA[3] = alpha;
                this.updateUI();
                this.emitOnChange();
            }
        });

        // 应用按钮
        if (this.applyButton) {
            this.applyButton.addEventListener('click', () => {
                this.previousColor = this.getHEXA();
                this.close();
                this.emitOnChange(true);
            });
        }

        // 取消按钮
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.colorHSVA = this.hexToHSVA(this.previousColor);
                this.updateUI();
                if (this.button) {
                    this.updateButtonColor();
                }
                this.close();
            });
        }

        // 点击文档其他区域关闭选择器
        document.addEventListener('click', (e) => {
            if (this.popup.classList.contains('active')) {
                let targetEl = e.target;
                let isClickInside = false;
                
                while (targetEl !== null) {
                    if (targetEl === this.container) {
                        isClickInside = true;
                        break;
                    }
                    targetEl = targetEl.parentElement;
                }
                
                if (!isClickInside) {
                    this.close();
                }
            }
        });

        // 窗口大小变化时重新定位
        window.addEventListener('resize', () => {
            if (this.popup.classList.contains('active') || 
                (this.popup.style.display === 'block')) {
                this.positionPopup();
            }
        });

        // 饱和度区域鼠标移动绑定
        this.handleSaturationMouseMove = (e) => {
            if (this.dragging.saturation) {
                this.updateSaturationPosition(e);
                e.preventDefault();
            }
        };

        // 饱和度区域鼠标释放绑定
        this.handleSaturationMouseUp = () => {
            this.dragging.saturation = false;
            document.removeEventListener('mousemove', this.handleSaturationMouseMove);
            document.removeEventListener('mouseup', this.handleSaturationMouseUp);
        };

        // 色相滑块鼠标移动绑定
        this.handleHueMouseMove = (e) => {
            if (this.dragging.hue) {
                this.updateHuePosition(e);
                e.preventDefault();
            }
        };

        // 色相滑块鼠标释放绑定
        this.handleHueMouseUp = () => {
            this.dragging.hue = false;
            document.removeEventListener('mousemove', this.handleHueMouseMove);
            document.removeEventListener('mouseup', this.handleHueMouseUp);
        };

        // 透明度滑块鼠标移动绑定
        this.handleAlphaMouseMove = (e) => {
            if (this.dragging.alpha) {
                this.updateAlphaPosition(e);
                e.preventDefault();
            }
        };

        // 透明度滑块鼠标释放绑定
        this.handleAlphaMouseUp = () => {
            this.dragging.alpha = false;
            document.removeEventListener('mousemove', this.handleAlphaMouseMove);
            document.removeEventListener('mouseup', this.handleAlphaMouseUp);
        };
    }

    // 创建预设颜色
    createColorSwatches() {
        if (!this.swatches) return;
        
        this.swatches.innerHTML = '';
        
        this.options.presetColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-picker-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => {
                this.colorHSVA = this.hexToHSVA(color);
                // 保持当前透明度不变
                this.colorHSVA[3] = this.alphaInput.value / 100;
                this.updateUI();
                this.emitOnChange();
            });
            this.swatches.appendChild(swatch);
        });
    }

    // 更新饱和度/明度指针位置
    updateSaturationPosition(e) {
        const rect = this.saturation.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // 限制在区域内
        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));
        
        // 更新指针位置
        this.saturationPointer.style.left = `${x}px`;
        this.saturationPointer.style.top = `${y}px`;
        
        // 更新颜色
        this.colorHSVA[1] = x / rect.width;
        this.colorHSVA[2] = 1 - (y / rect.height);
        
        // 更新界面
        this.updateColorUI();
        this.emitOnChange();
    }

    // 更新色相滑块位置
    updateHuePosition(e) {
        const rect = this.hue.getBoundingClientRect();
        let x = e.clientX - rect.left;
        
        // 限制在区域内
        x = Math.max(0, Math.min(x, rect.width));
        
        // 更新滑块位置
        this.hueSlider.style.left = `${x}px`;
        
        // 更新颜色
        this.colorHSVA[0] = x / rect.width * 360;
        
        // 更新界面
        this.updateColorUI();
        this.emitOnChange();
    }

    // 更新透明度滑块位置
    updateAlphaPosition(e) {
        const rect = this.alpha.getBoundingClientRect();
        let x = e.clientX - rect.left;
        
        // 限制在区域内
        x = Math.max(0, Math.min(x, rect.width));
        
        // 更新滑块位置
        this.alphaSlider.style.left = `${x}px`;
        
        // 更新颜色
        this.colorHSVA[3] = x / rect.width;
        
        // 更新界面
        this.updateColorUI();
        this.emitOnChange();
    }

    // 更新颜色相关UI
    updateColorUI() {
        // 更新饱和度区域背景色 (仅色相)
        const hueColor = this.HSVAToRGBA([this.colorHSVA[0], 1, 1, 1]);
        this.saturation.style.backgroundColor = `rgb(${hueColor[0]}, ${hueColor[1]}, ${hueColor[2]})`;
        
        // 更新透明度滑块背景色
        const rgbValue = this.HSVAToRGBA(this.colorHSVA);
        this.alphaGradient.style.background = `linear-gradient(to right, rgba(${rgbValue[0]}, ${rgbValue[1]}, ${rgbValue[2]}, 0), rgb(${rgbValue[0]}, ${rgbValue[1]}, ${rgbValue[2]}))`;
        
        // 更新当前颜色预览
        const hexColor = this.getHEXA();
        this.currentPreview.style.backgroundColor = hexColor;
        
        // 更新HEX输入框
        this.hexInput.value = hexColor;
        
        // 更新透明度输入框
        this.alphaInput.value = Math.round(this.colorHSVA[3] * 100);
    }

    // 更新整个UI
    updateUI() {
        // 更新指针位置
        const satRect = this.saturation.getBoundingClientRect();
        const satX = this.colorHSVA[1] * satRect.width;
        const satY = (1 - this.colorHSVA[2]) * satRect.height;
        this.saturationPointer.style.left = `${satX}px`;
        this.saturationPointer.style.top = `${satY}px`;
        
        // 更新色相滑块位置
        const hueRect = this.hue.getBoundingClientRect();
        const hueX = this.colorHSVA[0] / 360 * hueRect.width;
        this.hueSlider.style.left = `${hueX}px`;
        
        // 更新透明度滑块位置
        const alphaRect = this.alpha.getBoundingClientRect();
        const alphaX = this.colorHSVA[3] * alphaRect.width;
        this.alphaSlider.style.left = `${alphaX}px`;
        
        // 更新颜色相关UI
        this.updateColorUI();
    }

    // 更新按钮颜色
    updateButtonColor() {
        if (!this.button) return;
        
        const hexColor = this.getHEXA();
        this.button.style.backgroundColor = hexColor;
    }

    // 定位弹出框
    positionPopup() {
        // 如果没有按钮元素，则不执行相对定位
        if (!this.button) {
            // 弹出框的位置应该已经通过CSS或其他方式设置
            return;
        }
        
        // 获取按钮和弹出框的尺寸及位置
        const buttonRect = this.button.getBoundingClientRect();
        const popupRect = this.popup.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 计算位置 - 优先显示在下方
        let left = buttonRect.left;
        let top = buttonRect.bottom + 10;
        
        // 水平居中对齐
        left = left - (popupRect.width / 2) + (buttonRect.width / 2);
        
        // 检查下方空间是否足够，不够则显示在上方
        if (top + popupRect.height > windowHeight - 10) {
            top = buttonRect.top - popupRect.height - 10;
        }
        
        // 确保左侧不超出屏幕
        if (left < 10) {
            left = 10;
        }
        
        // 确保右侧不超出屏幕
        if (left + popupRect.width > windowWidth - 10) {
            left = windowWidth - popupRect.width - 10;
        }
        
        // 应用计算出的位置
        this.popup.style.left = `${left}px`;
        this.popup.style.top = `${top}px`;
    }

    // 打开颜色选择器
    open() {
        this.previousColor = this.getHEXA();
        if (this.previousPreview) {
            this.previousPreview.style.backgroundColor = this.previousColor;
        }
        
        // 使用display: block而不是添加active类，确保样式一致性
        this.popup.style.display = 'block';
        
        // 只有在有按钮的情况下才执行自动定位
        if (this.button) {
            this.positionPopup();
        }
        
        // 延迟调用，以确保弹出框已经可见
        setTimeout(() => {
            this.updateUI();
        }, 0);
        
        if (typeof this.options.onOpen === 'function') {
            this.options.onOpen();
        }
    }

    // 关闭颜色选择器
    close() {
        // 使用display: none而不是移除active类，确保样式一致性
        this.popup.style.display = 'none';
        
        if (typeof this.options.onClose === 'function') {
            this.options.onClose();
        }
    }

    // 切换颜色选择器状态
    togglePicker() {
        if (this.popup.style.display === 'block') {
            this.close();
        } else {
            this.open();
        }
    }

    // 触发颜色变化回调
    emitOnChange(isFinal = false) {
        if (this.button) {
            this.updateButtonColor();
        }
        
        if (typeof this.options.onChange === 'function') {
            const color = {
                h: this.colorHSVA[0],         // 0-360
                s: this.colorHSVA[1],         // 0-1
                v: this.colorHSVA[2],         // 0-1
                a: this.colorHSVA[3],         // 0-1
                rgba: this.HSVAToRGBA(this.colorHSVA),
                hex: this.getHEX(),
                hexa: this.getHEXA()
            };
            
            this.options.onChange(color, isFinal);
        }
    }

    // 获取当前颜色的HEX值 (不含透明度)
    getHEX() {
        const rgba = this.HSVAToRGBA(this.colorHSVA);
        return this.rgbToHex(rgba[0], rgba[1], rgba[2]);
    }

    // 获取当前颜色的HEX值 (含透明度)
    getHEXA() {
        const rgba = this.HSVAToRGBA(this.colorHSVA);
        const alpha = Math.round(this.colorHSVA[3] * 255);
        
        // 如果透明度为1，返回不含透明度的HEX值
        if (alpha === 255) {
            return this.rgbToHex(rgba[0], rgba[1], rgba[2]);
        }
        
        return this.rgbToHex(rgba[0], rgba[1], rgba[2]) + this.componentToHex(alpha);
    }

    // 将RGB分量转换为Hex字符串
    componentToHex(c) {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }

    // 将RGB值转换为Hex
    rgbToHex(r, g, b) {
        return '#' + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    }

    // 检查HEX值是否有效
    isValidHex(hex) {
        return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{8}$)|(^#[0-9A-F]{3}$)/i.test(hex);
    }

    // 将HEX值转换为HSVA
    hexToHSVA(hex) {
        // 移除#前缀
        hex = hex.replace(/^#/, '');
        
        let r, g, b, a = 1;
        
        // 处理3位、6位和8位HEX
        if (hex.length === 3) {
            r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
            g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
            b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (hex.length === 8) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
            a = parseInt(hex.substring(6, 8), 16) / 255;
        }
        
        return this.RGBAToHSVA([r, g, b, a]);
    }

    // 将RGBA值转换为HSVA
    RGBAToHSVA(rgba) {
        const r = rgba[0] / 255;
        const g = rgba[1] / 255;
        const b = rgba[2] / 255;
        const a = rgba[3];
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h, s, v;
        
        // 计算色相
        if (delta === 0) {
            h = 0;
        } else if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        // 计算饱和度和明度
        v = max;
        s = max === 0 ? 0 : delta / max;
        
        return [h, s, v, a];
    }

    // 将HSVA值转换为RGBA
    HSVAToRGBA(hsva) {
        const h = hsva[0];
        const s = hsva[1];
        const v = hsva[2];
        const a = hsva[3];
        
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h >= 0 && h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h >= 60 && h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h >= 120 && h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h >= 180 && h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h >= 240 && h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }
        
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
            a
        ];
    }
}

// 页面加载后初始化颜色选择器
document.addEventListener('DOMContentLoaded', function() {
    // 背景颜色选择器
    if (document.getElementById('bg-color-picker-wrapper')) {
        const bgColorPicker = new ColorPicker({
            containerId: 'bg-color-picker-wrapper',
            buttonId: 'bg-color-btn',
            popupId: 'bg-color-popup',
            saturationId: 'bg-color-saturation',
            hueId: 'bg-color-hue',
            alphaId: 'bg-color-alpha',
            hexInputId: 'bg-color-hex',
            alphaInputId: 'bg-color-alpha-input',
            currentPreviewId: 'bg-color-current',
            previousPreviewId: 'bg-color-previous',
            swatchesId: 'bg-color-swatches',
            applyButtonId: 'bg-color-apply',
            cancelButtonId: 'bg-color-cancel',
            initialColor: '#f0f0f0',
            position: 'right',
            onChange: function(color, isFinal) {
                // 更新隐藏的原生颜色选择器的值
                document.getElementById('solid-color-picker').value = color.hex;
                
                // 触发change事件，以便应用程序能够感知到颜色变化
                if (isFinal) {
                    const event = new Event('change');
                    document.getElementById('solid-color-picker').dispatchEvent(event);
                }
            }
        });
    }
    
    // 元素颜色选择器
    if (document.getElementById('element-color-picker-wrapper')) {
        const elementColorPicker = new ColorPicker({
            containerId: 'element-color-picker-wrapper',
            buttonId: 'element-color-btn',
            popupId: 'element-color-popup',
            saturationId: 'element-color-saturation',
            hueId: 'element-color-hue',
            alphaId: 'element-color-alpha',
            hexInputId: 'element-color-hex',
            alphaInputId: 'element-color-alpha-input',
            currentPreviewId: 'element-color-current',
            previousPreviewId: 'element-color-previous',
            swatchesId: 'element-color-swatches',
            applyButtonId: 'element-color-apply',
            cancelButtonId: 'element-color-cancel',
            initialColor: '#000000',
            position: 'right',
            onChange: function(color, isFinal) {
                // 更新隐藏的原生颜色选择器的值
                document.getElementById('element-color').value = color.hex;
                
                // 触发change事件，以便应用程序能够感知到颜色变化
                if (isFinal) {
                    const event = new Event('change');
                    document.getElementById('element-color').dispatchEvent(event);
                }
            }
        });
    }
}); 