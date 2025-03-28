// 全局变量
let canvas;
let selectedElement = null;
let canvasWidth = 1920;
let canvasHeight = 1080;
let zoomLevel = 1;
let autoFitZoom = true; // 是否自动适应容器大小

// 渐变编辑器相关
let gradientStops = [
    { offset: 0, color: '#ffffff' },
    { offset: 1, color: '#000000' }
];
let activeStopIndex = -1;
let gradientAngle = 0;
let radialCenterX = 50; // 百分比
let radialCenterY = 50; // 百分比
let radialRadius = 100; // 百分比

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initCanvas();
    setupEventListeners();
    setupGradientEditor();
    setupLocalStorage();
});

// 初始化Canvas
function initCanvas() {
    // 检查是否已加载Fabric.js
    if (typeof fabric === 'undefined') {
        console.error('Fabric.js 未加载，请检查网络连接或引入本地文件');
        return;
    }

    // 创建Fabric.js画布
    canvas = new fabric.Canvas('wallpaper-canvas', {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#f0f0f0',
        selection: true,
        preserveObjectStacking: true
    });
    
    // 修正画布的CSS样式，确保upper-canvas和lower-canvas保持一致的宽高比
    adjustCanvasCSS();
    
    // 设置画布大小
    updateCanvasSize();
    
    // 监听对象选择事件
    canvas.on('selection:created', onObjectSelected);
    canvas.on('selection:updated', onObjectSelected);
    canvas.on('selection:cleared', onSelectionCleared);
    
    // 更新画布信息
    updateCanvasInfo();
}

// 调整画布的CSS样式，确保正确缩放
function adjustCanvasCSS() {
    // 获取所有相关的canvas元素
    const canvasWrapper = canvas.wrapperEl;
    const lowerCanvas = canvas.lowerCanvasEl;
    const upperCanvas = canvas.upperCanvasEl;
    
    // 重置包装元素的样式
    canvasWrapper.style.width = `${canvasWidth}px`;
    canvasWrapper.style.height = `${canvasHeight}px`;
    canvasWrapper.style.position = 'absolute';
    canvasWrapper.style.transformOrigin = 'center center';
    
    // 确保upper-canvas和lower-canvas有相同的尺寸
    [lowerCanvas, upperCanvas].forEach(canvasEl => {
        canvasEl.style.width = '100%';
        canvasEl.style.height = '100%';
        canvasEl.style.position = 'absolute';
        canvasEl.style.top = '0';
        canvasEl.style.left = '0';
    });
}

// 更新画布大小
function updateCanvasSize() {
    // 先清除canvasWrapper的transform，以获取真实尺寸
    if (canvas && canvas.wrapperEl) {
        canvas.wrapperEl.style.transform = '';
    }
    
    // 设置画布尺寸
    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);
    
    // 获取容器尺寸
    const container = document.querySelector('.canvas-outer-container');
    if (!container) return;
    
    // 计算可用空间，减去内边距
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    // 计算适合容器的缩放比例
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    
    // 根据画布形状选择缩放策略
    let autoZoom;
    if (canvasHeight > canvasWidth) {
        // 竖向画布优先考虑高度
        autoZoom = Math.min(scaleY, scaleX);
    } else {
        // 横向画布优先考虑宽度
        autoZoom = Math.min(scaleX, scaleY);
    }
    
    // 限制最大缩放为1，防止画布过大
    autoZoom = Math.min(autoZoom, 1);
    
    // 应用缩放比例
    if (autoFitZoom) {
        zoomLevel = autoZoom;
        const zoomSlider = document.getElementById('zoom-slider');
        if (zoomSlider) {
            zoomSlider.value = Math.round(zoomLevel * 100);
        }
    }
    
    // 居中显示
    centerCanvasInContainer();
    
    // 更新画布信息
    updateCanvasInfo();
    
    // 重新渲染
    canvas.renderAll();
}

// 新增：应用缩放函数
function applyZoom() {
    if (!canvas || !canvas.wrapperEl) return;
    
    // 获取canvas包装元素并应用缩放变换
    const canvasWrapper = canvas.wrapperEl;
    canvasWrapper.style.transform = `scale(${zoomLevel})`;
    
    // 居中显示
    centerCanvasInContainer();
    
    // 重新渲染画布
    canvas.renderAll();
}

// 将画布居中显示在容器中
function centerCanvasInContainer() {
    if (!canvas || !canvas.wrapperEl) return;
    
    const container = document.querySelector('.canvas-outer-container');
    if (!container) return;
    
    // 获取容器和画布尺寸
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 计算画布中心位置
    const canvasWrapper = canvas.wrapperEl;
    
    // 重置所有位置和变换属性，确保从干净状态开始
    canvasWrapper.style.position = 'absolute';
    canvasWrapper.style.left = '50%';
    canvasWrapper.style.top = '50%';
    
    // 使用CSS transform同时处理居中和缩放
    canvasWrapper.style.transform = `translate(-50%, -50%) scale(${zoomLevel})`;
    canvasWrapper.style.transformOrigin = 'center center';
}

// 更新画布信息
function updateCanvasInfo() {
    // 显示当前画布尺寸
    const canvasSizeElement = document.getElementById('canvas-size');
    if (canvasSizeElement) {
        // 计算横纵比
        const ratio = canvasWidth / canvasHeight;
        const ratioFormatted = ratio.toFixed(2);
        
        // 显示尺寸和横纵比
        canvasSizeElement.textContent = `${canvasWidth} × ${canvasHeight} (${ratioFormatted}:1)`;
    }
    
    // 显示当前缩放比例
    const zoomPercent = Math.round(zoomLevel * 100);
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) {
        zoomSlider.value = zoomPercent;
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 缩放滑块事件监听
    document.getElementById('zoom-slider').addEventListener('input', function(e) {
        // 更新缩放级别
        zoomLevel = parseInt(e.target.value) / 100;
        // 关闭自动适应模式
        autoFitZoom = false;
        
        // 居中显示
        centerCanvasInContainer();
        
        // 更新画布信息
        updateCanvasInfo();
        
        // 重新渲染
        canvas.renderAll();
    });
    
    // 重置缩放按钮事件监听
    document.getElementById('reset-zoom').addEventListener('click', function() {
        // 开启自动适应模式
        autoFitZoom = true;
        
        // 重新计算并应用画布大小
        updateCanvasSize();
    });
    
    // 窗口大小调整事件
    window.addEventListener('resize', function() {
        // 如果启用了自动适应，重新计算缩放比例
        if (autoFitZoom) {
            updateCanvasSize();
        } else {
            // 即使不自动缩放，也要调整画布容器中的位置
            centerCanvasInContainer();
        }
    });
    
    // 壁纸尺寸预设按钮点击事件
    document.querySelectorAll('.preset-btn').forEach(button => {
        button.addEventListener('click', function() {
            // 移除其他按钮的活跃状态
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 为当前按钮添加活跃状态
            this.classList.add('active');
            
            // 获取并应用尺寸
            const width = parseInt(this.dataset.width);
            const height = parseInt(this.dataset.height);
            
            // 更新自定义尺寸输入框
            document.getElementById('custom-width').value = width;
            document.getElementById('custom-height').value = height;
            
            // 应用尺寸
            changeCanvasSize(width, height);
        });
    });
    
    // 自定义尺寸按钮
    document.getElementById('apply-custom-size').addEventListener('click', function() {
        const width = parseInt(document.getElementById('custom-width').value);
        const height = parseInt(document.getElementById('custom-height').value);
        if (width > 0 && height > 0) {
            changeCanvasSize(width, height);
            // 清除预设按钮的高亮
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        }
    });
    
    // 背景类型切换
    document.querySelectorAll('input[name="bg-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            toggleBackgroundControls();
            updateBackground();
        });
    });
    
    // 背景颜色选择器
    document.getElementById('solid-color-picker').addEventListener('input', updateBackground);
    
    // 渐变类型选择
    document.getElementById('gradient-type').addEventListener('change', function() {
        toggleGradientTypeControls();
        updateBackground();
    });
    
    // 渐变角度控制
    document.getElementById('gradient-angle').addEventListener('input', function(e) {
        gradientAngle = parseInt(e.target.value);
        document.getElementById('gradient-angle-text').value = gradientAngle;
        updateGradientPreview();
        updateBackground();
    });

    document.getElementById('gradient-angle-text').addEventListener('input', function(e) {
        gradientAngle = parseInt(e.target.value) || 0;
        if (gradientAngle < 0) gradientAngle = 0;
        if (gradientAngle > 360) gradientAngle = 360;
        document.getElementById('gradient-angle').value = gradientAngle;
        updateGradientPreview();
        updateBackground();
    });
    
    // 径向渐变控制
    const radialControls = [
        { slider: 'gradient-center-x', input: 'gradient-center-x-text', property: 'radialCenterX' },
        { slider: 'gradient-center-y', input: 'gradient-center-y-text', property: 'radialCenterY' },
        { slider: 'gradient-radius', input: 'gradient-radius-text', property: 'radialRadius' }
    ];
    
    radialControls.forEach(control => {
        const slider = document.getElementById(control.slider);
        const input = document.getElementById(control.input);
        
        slider.addEventListener('input', function(e) {
            const value = parseInt(e.target.value);
            input.value = value;
            
            if (control.property === 'radialCenterX') radialCenterX = value;
            else if (control.property === 'radialCenterY') radialCenterY = value;
            else if (control.property === 'radialRadius') radialRadius = value;
            
            updateGradientPreview();
            updateBackground();
        });
        
        input.addEventListener('input', function(e) {
            let value = parseInt(e.target.value) || 0;
            const max = parseInt(input.getAttribute('max'));
            if (value < 0) value = 0;
            if (value > max) value = max;
            
            slider.value = value;
            
            if (control.property === 'radialCenterX') radialCenterX = value;
            else if (control.property === 'radialCenterY') radialCenterY = value;
            else if (control.property === 'radialRadius') radialRadius = value;
            
            updateGradientPreview();
            updateBackground();
        });
    });
    
    // 图形元素按钮
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            addShape(this.dataset.shape);
        });
    });
    
    // 元素属性控制
    document.getElementById('element-color').addEventListener('input', updateElementProperties);
    document.getElementById('element-opacity').addEventListener('input', updateElementProperties);
    document.getElementById('element-size').addEventListener('input', updateElementProperties);
    document.getElementById('element-rotation').addEventListener('input', updateElementProperties);
    
    // 图层控制
    document.getElementById('bring-forward').addEventListener('click', bringForward);
    document.getElementById('send-backward').addEventListener('click', sendBackward);
    document.getElementById('delete-element').addEventListener('click', deleteElement);
    
    // 保存和下载按钮
    document.getElementById('save-btn').addEventListener('click', saveDesign);
    document.getElementById('download-btn').addEventListener('click', showDownloadModal);
    
    // 下载模态框
    const modal = document.getElementById('download-modal');
    document.querySelector('.close').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    document.getElementById('confirm-download').addEventListener('click', downloadWallpaper);
    document.getElementById('download-quality').addEventListener('input', updateQualityValue);
}

// 切换背景控制面板
function toggleBackgroundControls() {
    const bgType = document.querySelector('input[name="bg-type"]:checked').value;
    
    if (bgType === 'solid') {
        document.getElementById('solid-bg-controls').style.display = 'block';
        document.getElementById('gradient-controls').style.display = 'none';
    } else {
        document.getElementById('solid-bg-controls').style.display = 'none';
        document.getElementById('gradient-controls').style.display = 'block';
        updateGradientPreview();
    }
}

// 切换渐变类型控制面板
function toggleGradientTypeControls() {
    const gradientType = document.getElementById('gradient-type').value;
    
    if (gradientType === 'linear') {
        document.getElementById('linear-controls').style.display = 'block';
        document.getElementById('radial-controls').style.display = 'none';
    } else {
        document.getElementById('linear-controls').style.display = 'none';
        document.getElementById('radial-controls').style.display = 'block';
    }
    
    updateGradientPreview();
}

// 设置渐变编辑器
function setupGradientEditor() {
    const stopsContainer = document.getElementById('gradient-stops');
    let colorPickerModal = null;
    let currentStopElement = null;

    // 创建一个渐变节点专用的自定义颜色选择器
    const gradientNodeColorPicker = document.createElement('div');
    gradientNodeColorPicker.className = 'color-picker-wrapper';
    gradientNodeColorPicker.id = 'gradient-node-color-picker-wrapper';
    gradientNodeColorPicker.style.position = 'fixed';  // 使用fixed定位而不是absolute
    gradientNodeColorPicker.style.zIndex = '30000';    // 确保最高层级
    gradientNodeColorPicker.style.top = '0';           // 初始位置设为0
    gradientNodeColorPicker.style.left = '0';          // 初始位置设为0
    gradientNodeColorPicker.innerHTML = `
        <div class="color-picker-popup" id="gradient-node-color-popup" style="display: none; position: absolute; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 0, 0, 0.1);">
            <div class="color-picker-saturation" id="gradient-node-color-saturation">
                <div class="color-picker-saturation-pointer"></div>
            </div>
            <div class="color-picker-hue" id="gradient-node-color-hue">
                <div class="color-picker-hue-slider"></div>
            </div>
            <div class="color-picker-alpha" id="gradient-node-color-alpha">
                <div class="color-picker-alpha-gradient"></div>
                <div class="color-picker-alpha-slider"></div>
            </div>
            <div class="color-picker-preview">
                <div class="color-preview-current" id="gradient-node-color-current"></div>
                <div class="color-preview-previous" id="gradient-node-color-previous"></div>
            </div>
            <div class="color-picker-inputs">
                <div class="color-picker-input-group">
                    <label>HEX</label>
                    <input type="text" id="gradient-node-color-hex" maxlength="9">
                </div>
                <div class="color-picker-input-group">
                    <label>透明度</label>
                    <input type="number" id="gradient-node-color-alpha-input" min="0" max="100" value="100">
                </div>
            </div>
            <div class="color-picker-swatches" id="gradient-node-color-swatches">
                <!-- 预设颜色将通过JS动态添加 -->
            </div>
        </div>
    `;
    document.body.appendChild(gradientNodeColorPicker);

    // 初始化渐变节点颜色选择器
    let gradientNodePicker = null;
    
    // 添加初始渐变节点
    if (gradientStops.length === 0) {
        gradientStops = [
            { offset: 0, color: '#000000' },
            { offset: 1, color: '#ffffff' }
        ];
    }
    
    // 点击渐变条添加新的节点
    stopsContainer.addEventListener('click', function(e) {
        // 忽略冒泡上来的点击事件
        if (e.target !== stopsContainer) return;
        
        // 计算点击位置相对于容器的百分比
        const rect = stopsContainer.getBoundingClientRect();
        const offset = (e.clientX - rect.left) / rect.width;
        
        // 添加新的节点
        addGradientStop(offset);
    });
    
    // 添加节点按钮
    document.getElementById('add-gradient-stop').addEventListener('click', function() {
        addStopBetweenActive();
    });
    
    // 删除节点按钮
    document.getElementById('delete-gradient-stop').addEventListener('click', function() {
        deleteActiveGradientStop();
    });
    
    // 渲染节点
    renderGradientStops();
    updateGradientPreview();

    // 传统颜色选择器相关方法
    function createColorPicker() {
        // 如果已经存在，则返回现有实例
        if (colorPickerModal) return colorPickerModal;
        
        // 创建颜色选择器容器
        colorPickerModal = document.createElement('div');
        colorPickerModal.id = 'color-picker-modal';
        colorPickerModal.className = 'color-picker-modal';
        
        // 创建颜色选择器内容
        colorPickerModal.innerHTML = `
            <div class="color-picker-container">
                <div class="color-picker-header">
                    <span class="color-picker-title">颜色选择器</span>
                    <span class="close-color-picker">&times;</span>
                </div>
                <div class="color-picker-content">
                    <!-- 此处省略了部分内容 -->
                </div>
            </div>
        `;
        
        // 添加到文档
        document.body.appendChild(colorPickerModal);
        
        // 设置关闭按钮事件
        colorPickerModal.querySelector('.close-color-picker').addEventListener('click', hideColorPicker);
        
        // 点击外部关闭
        document.addEventListener('mousedown', function(event) {
            if (colorPickerModal && colorPickerModal.style.display === 'block') {
                // 检查点击是否在颜色选择器外部
                if (!colorPickerModal.contains(event.target) && 
                    !event.target.classList.contains('gradient-stop-color')) {
                    hideColorPicker();
                }
            }
        });
        
        return colorPickerModal;
    }

    function hideColorPicker() {
        if (colorPickerModal) {
            colorPickerModal.style.display = 'none';
        }
        
        // 隐藏自定义颜色选择器
        const gradientColorPopup = document.getElementById('gradient-node-color-popup');
        if (gradientColorPopup) {
            gradientColorPopup.style.display = 'none';
        }
    }

    // 直接初始化颜色选择器
    if (document.getElementById('gradient-node-color-picker-wrapper')) {
        // 初始化颜色选择器
        gradientNodePicker = new ColorPicker({
            containerId: 'gradient-node-color-picker-wrapper',
            buttonId: null, // 不使用按钮，由节点点击触发
            popupId: 'gradient-node-color-popup',
            saturationId: 'gradient-node-color-saturation',
            hueId: 'gradient-node-color-hue',
            alphaId: 'gradient-node-color-alpha',
            hexInputId: 'gradient-node-color-hex',
            alphaInputId: 'gradient-node-color-alpha-input',
            currentPreviewId: 'gradient-node-color-current',
            previousPreviewId: 'gradient-node-color-previous',
            swatchesId: 'gradient-node-color-swatches',
            initialColor: '#000000',
            position: 'right',
            onChange: function(color, isFinal) {
                if (activeStopIndex >= 0 && activeStopIndex < gradientStops.length) {
                    // 更新渐变节点颜色
                    gradientStops[activeStopIndex].color = color.hexa;
                    
                    // 更新UI
                    renderGradientStops();
                    updateGradientPreview();
                    updateBackground();
                }
            }
        });
    }

    // 设置当前操作的节点元素
    function setCurrentStopElement(element) {
        currentStopElement = element;
    }

    // 将需要暴露的函数返回出去
    return {
        hideColorPicker: hideColorPicker,
        setCurrentStopElement: setCurrentStopElement,
        
        showColorPicker: function(anchorElement, color) {
            // 强制浏览器重新计算元素位置
            void document.body.offsetHeight;
            
            setTimeout(() => {
                // 获取锚点元素位置
                const anchorRect = anchorElement.getBoundingClientRect();
                
                // 使用自定义颜色选择器
                if (gradientNodePicker) {
                    // 设置初始颜色
                    gradientNodePicker.colorHSVA = gradientNodePicker.hexToHSVA(color);
                    gradientNodePicker.updateUI();
                    
                    // 获取弹出框元素
                    const popupEl = document.getElementById('gradient-node-color-popup');
                    if (!popupEl) return;
                    
                    // 先隐藏其他颜色选择器
                    hideColorPicker();
                    
                    // 先显示弹出框，以便获取其尺寸，但设置为不可见
                    popupEl.style.display = 'block';
                    popupEl.style.visibility = 'hidden';
                    
                    // 强制浏览器重新计算布局
                    void popupEl.offsetWidth;
                    
                    // 获取渐变条容器的位置
                    const stopsContainer = document.getElementById('gradient-stops');
                    const stopsRect = stopsContainer.getBoundingClientRect();
                    
                    // 计算位置 - 基于渐变条的位置，而非锚点元素
                    // 水平位置根据当前选中渐变节点的偏移量计算
                    let left = stopsRect.left + (stopsRect.width * gradientStops[activeStopIndex].offset);
                    let top = stopsRect.bottom + 10; // 渐变条下方10px
                    
                    // 水平居中对齐弹出框到节点位置
                    left = left - (popupEl.offsetWidth / 2);
                    
                    // 检查下方空间是否足够，不够则显示在上方
                    if (top + popupEl.offsetHeight > window.innerHeight - 10) {
                        top = stopsRect.top - popupEl.offsetHeight - 10;
                    }
                    
                    // 确保左侧不超出屏幕
                    if (left < 10) {
                        left = 10;
                    }
                    
                    // 确保右侧不超出屏幕
                    if (left + popupEl.offsetWidth > window.innerWidth - 10) {
                        left = window.innerWidth - popupEl.offsetWidth - 10;
                    }
                    
                    // 设置位置 - 使用fixed定位
                    popupEl.style.position = 'fixed';
                    popupEl.style.left = `${left}px`;
                    popupEl.style.top = `${top}px`;
                    
                    // 现在设置为可见
                    popupEl.style.visibility = 'visible';
                    
                    // 创建一个一次性事件监听器来处理点击外部关闭
                    // 先移除可能存在的旧事件处理器
                    document.removeEventListener('mousedown', handleOutsideClick);
                    
                    // 添加新的事件处理器
                    document.addEventListener('mousedown', handleOutsideClick);
                    
                    // 记录当前颜色选择器打开状态
                    window.isGradientColorPickerOpen = true;
                    
                    function handleOutsideClick(e) {
                        // 检查点击是否在颜色选择器外部
                        if (!popupEl.contains(e.target) && 
                            !anchorElement.contains(e.target) && 
                            e.target !== anchorElement) {
                            
                            // 隐藏颜色选择器
                            popupEl.style.display = 'none';
                            
                            // 移除事件监听器
                            document.removeEventListener('mousedown', handleOutsideClick);
                            
                            // 更新颜色选择器状态
                            window.isGradientColorPickerOpen = false;
                        }
                    }
                } else {
                    // 回退到旧的颜色选择器
                    if (!colorPickerModal) {
                        createColorPicker();
                    }
                    colorPickerModal.style.display = 'block';
                    
                    const pickerRect = colorPickerModal.getBoundingClientRect();
                    
                    let left = anchorRect.right + 10;
                    let top = anchorRect.top - 80;
                    
                    const windowWidth = window.innerWidth;
                    if (left + pickerRect.width > windowWidth) {
                        left = anchorRect.left - pickerRect.width - 10;
                    }
                    
                    if (top < 10) {
                        top = 10;
                    }
                    
                    const windowHeight = window.innerHeight;
                    if (top + pickerRect.height > windowHeight) {
                        top = windowHeight - pickerRect.height - 10;
                    }
                    
                    colorPickerModal.style.left = `${left}px`;
                    colorPickerModal.style.top = `${top}px`;
                }
            }, 50);
        }
    };
}

// 初始化颜色选择器并获取其接口
const colorPickerInterface = setupGradientEditor();

// 渲染渐变节点
function renderGradientStops() {
    const stopsContainer = document.getElementById('gradient-stops');
    stopsContainer.innerHTML = '';
    
    // 确保节点是按照offset排序的
    gradientStops.sort((a, b) => a.offset - b.offset);
    
    gradientStops.forEach((stop, index) => {
        const stopElement = document.createElement('div');
        stopElement.classList.add('gradient-stop');
        if (index === activeStopIndex) {
            stopElement.classList.add('active');
        }
        stopElement.style.left = `${stop.offset * 100}%`;
        stopElement.style.backgroundColor = stop.color;
        
        // 创建颜色指示器（上方的小圆点）
        const colorElement = document.createElement('div');
        colorElement.classList.add('gradient-stop-color');
        colorElement.style.backgroundColor = stop.color;
        stopElement.appendChild(colorElement);
        
        // 点击矩形滑块选中节点
        stopElement.addEventListener('click', function(e) {
            e.stopPropagation();
            activeStopIndex = index;
            renderGradientStops(); // 重新渲染以显示活动状态
        });
        
        // 点击颜色指示器打开颜色选择器
        colorElement.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // 选中当前节点
            activeStopIndex = index;
            
            // 更新渐变停止点UI
            renderGradientStops();
            
            // 存储当前停止点元素的引用
            colorPickerInterface.setCurrentStopElement(stopElement);
            
            // 显示颜色选择器
            colorPickerInterface.showColorPicker(colorElement, stop.color);
        });
        
        // 拖动节点
        stopElement.addEventListener('mousedown', function(e) {
            // 如果点击的是颜色指示器，不进行拖动
            if (e.target === colorElement) return;
            
            e.stopPropagation();
            
            // 点击时记录当前活动的节点
            activeStopIndex = index;
            renderGradientStops(); // 重新渲染以显示活动状态
            
            // 获取当前选中的节点元素（重新获取，因为renderGradientStops会重建DOM）
            const currentStopElement = document.querySelector('.gradient-stop.active');
            if (!currentStopElement) return;
            
            const startX = e.clientX;
            const startLeft = stop.offset * 100;
            const containerWidth = stopsContainer.clientWidth;
            
            function handleMouseMove(moveEvent) {
                moveEvent.preventDefault(); // 防止拖动时选择文本
                
                const deltaX = moveEvent.clientX - startX;
                const percentDelta = deltaX / containerWidth * 100;
                let newLeft = startLeft + percentDelta;
                
                // 限制在0-100%范围内
                newLeft = Math.max(0, Math.min(100, newLeft));
                
                // 更新节点位置（只更新数据和当前节点的样式，不重绘整个节点列表）
                stop.offset = newLeft / 100;
                currentStopElement.style.left = `${newLeft}%`;
                
                // 实时更新渐变预览，但不更新背景（提高性能）
                updateGradientPreview();
            }
            
            function handleMouseUp() {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                // 排序渐变节点
                gradientStops.sort((a, b) => a.offset - b.offset);
                // 找到排序后当前节点的位置
                activeStopIndex = gradientStops.indexOf(stop);
                
                renderGradientStops();
                updateGradientPreview();
                updateBackground();
            }
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        stopsContainer.appendChild(stopElement);
    });
}

// 颜色转换工具函数
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    
    // 如果是三位十六进制，转换为六位
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // 灰色
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        
        h = Math.round(h * 60);
    }
    
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return { h, s, l };
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
        r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

// 添加渐变节点
function addGradientStop(offset, color) {
    // 如果没有指定颜色，计算插值颜色
    if (!color) {
        // 确保节点是按照offset排序的
        gradientStops.sort((a, b) => a.offset - b.offset);
        
        // 找到左右两个节点
        let leftStop = null;
        let rightStop = null;
        
        for (let i = 0; i < gradientStops.length; i++) {
            if (gradientStops[i].offset <= offset) {
                leftStop = gradientStops[i];
            } else {
                rightStop = gradientStops[i];
                break;
            }
        }
        
        // 计算新节点的颜色
        if (leftStop && rightStop) {
            // 根据位置在两个相邻节点之间进行颜色插值
            const t = (offset - leftStop.offset) / (rightStop.offset - leftStop.offset);
            color = interpolateColor(leftStop.color, rightStop.color, t);
        } else if (leftStop) {
            color = leftStop.color;
        } else if (rightStop) {
            color = rightStop.color;
        } else {
            color = '#000000';
        }
    }
    
    // 添加新的节点
    const newStop = { offset, color };
    gradientStops.push(newStop);
    
    // 更新活动节点为新添加的节点
    gradientStops.sort((a, b) => a.offset - b.offset);
    activeStopIndex = gradientStops.indexOf(newStop);
    
    renderGradientStops();
    updateGradientPreview();
    updateBackground();
}

// 更新渐变预览
function updateGradientPreview() {
    const previewElement = document.getElementById('gradient-preview');
    
    // 确保节点是按照offset排序的
    const sortedStops = [...gradientStops].sort((a, b) => a.offset - b.offset);
    
    // 构建CSS渐变字符串（始终使用水平方向的线性渐变）
    let gradientCSS = 'linear-gradient(to right';
    
    // 添加所有渐变节点
    sortedStops.forEach(stop => {
        gradientCSS += `, ${stop.color} ${stop.offset * 100}%`;
    });
    
    gradientCSS += ')';
    
    // 应用到预览元素
    previewElement.style.backgroundImage = gradientCSS;
}

// 颜色插值函数
function interpolateColor(color1, color2, factor) {
    // 将十六进制颜色转换为RGB
    const hex2rgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };
    
    // 将RGB转换为十六进制
    const rgb2hex = (rgb) => {
        return '#' + rgb.map(v => {
            const hex = Math.round(v).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };
    
    const rgb1 = hex2rgb(color1);
    const rgb2 = hex2rgb(color2);
    
    // 线性插值
    const result = rgb1.map((v, i) => {
        return v + factor * (rgb2[i] - v);
    });
    
    return rgb2hex(result);
}

// 更新背景
function updateBackground() {
    try {
        const bgType = document.querySelector('input[name="bg-type"]:checked').value;
        
        // 先清除任何可能存在的背景对象
        canvas.getObjects().forEach(obj => {
            if (obj.id === 'background') {
                canvas.remove(obj);
            }
        });
        
        if (bgType === 'solid') {
            // 纯色背景
            const solidColorPicker = document.getElementById('solid-color-picker');
            const backgroundColor = solidColorPicker.value;
            
            // 清除可能的渐变背景
            canvas.setBackgroundColor(backgroundColor, canvas.renderAll.bind(canvas));
            
        } else if (bgType === 'gradient') {
            // 渐变背景
            const gradientType = document.getElementById('gradient-type').value;
            
            // 确保节点是按照offset排序的
            gradientStops.sort((a, b) => a.offset - b.offset);
            
            // 清除任何纯色背景
            canvas.setBackgroundColor('', canvas.renderAll.bind(canvas));
            
            if (gradientType === 'linear') {
                // 线性渐变 - 使用角度
                // 调整角度方向以匹配CSS的角度定义（CSS中0度是向上，顺时针旋转）
                const adjustedAngle = gradientAngle + 90;
                const adjustedRad = adjustedAngle * Math.PI / 180;
                
                // 计算单位向量
                const dx = Math.cos(adjustedRad);
                const dy = Math.sin(adjustedRad);
                
                // 计算从画布中心到四个角的向量
                const corners = [
                    { x: -canvasWidth/2, y: -canvasHeight/2 }, // 左上
                    { x: canvasWidth/2, y: -canvasHeight/2 },  // 右上
                    { x: canvasWidth/2, y: canvasHeight/2 },   // 右下
                    { x: -canvasWidth/2, y: canvasHeight/2 }   // 左下
                ];
                
                // 计算每个角投影到渐变方向上的距离
                let minProj = Number.MAX_VALUE;
                let maxProj = Number.MIN_VALUE;
                
                for (const corner of corners) {
                    // 计算角点在渐变方向上的投影
                    const proj = corner.x * dx + corner.y * dy;
                    minProj = Math.min(minProj, proj);
                    maxProj = Math.max(maxProj, proj);
                }
                
                // 画布中心坐标
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;
                
                // 计算渐变线的起点和终点，确保完全覆盖画布
                const x1 = centerX + minProj * dx;
                const y1 = centerY + minProj * dy;
                const x2 = centerX + maxProj * dx;
                const y2 = centerY + maxProj * dy;
                
                // 创建渐变对象
                const gradient = new fabric.Gradient({
                    type: 'linear',
                    coords: { x1, y1, x2, y2 },
                    colorStops: gradientStops
                });
                
                // 创建矩形作为背景
                const bgRect = new fabric.Rect({
                    left: 0,
                    top: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    fill: gradient,
                    selectable: false,
                    evented: false
                });
                
                // 添加渐变背景并移至底层
                bgRect.id = 'background';
                canvas.add(bgRect);
                bgRect.moveTo(0); // 移至最底层
                canvas.renderAll();
                
            } else if (gradientType === 'radial') {
                // 径向渐变 - 使用中心点和半径
                
                // 将百分比转换为实际坐标
                const centerX = canvasWidth * (radialCenterX / 100);
                const centerY = canvasHeight * (radialCenterY / 100);
                
                // 计算最佳半径，考虑到画布的实际尺寸和形状
                // 根据最长边计算合适的最大半径
                const maxDimension = Math.max(canvasWidth, canvasHeight);
                
                // 计算从中心到四个角的距离，找出最大距离
                const corners = [
                    { x: 0, y: 0 }, // 左上
                    { x: canvasWidth, y: 0 }, // 右上
                    { x: canvasWidth, y: canvasHeight }, // 右下
                    { x: 0, y: canvasHeight } // 左下
                ];
                
                let maxDistance = 0;
                for (const corner of corners) {
                    const dx = corner.x - centerX;
                    const dy = corner.y - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    maxDistance = Math.max(maxDistance, distance);
                }
                
                // 根据用户设置的半径百分比应用到最大距离
                const radius = maxDistance * (radialRadius / 100);
                
                // 创建渐变对象
                const gradient = new fabric.Gradient({
                    type: 'radial',
                    coords: {
                        r1: 0,
                        r2: radius,
                        x1: centerX,
                        y1: centerY,
                        x2: centerX,
                        y2: centerY
                    },
                    colorStops: gradientStops
                });
                
                // 创建矩形作为背景
                const bgRect = new fabric.Rect({
                    left: 0,
                    top: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    fill: gradient,
                    selectable: false,
                    evented: false
                });
                
                // 添加渐变背景并移至底层
                bgRect.id = 'background';
                canvas.add(bgRect);
                bgRect.moveTo(0); // 移至最底层
                canvas.renderAll();
            }
        }
    } catch (error) {
        console.error(`更新背景时出错: ${error.message}`);
    }
}

// 改变画布大小
function changeCanvasSize(width, height) {
    if (width <= 0 || height <= 0) return;
    
    // 检查画布是否有内容
    const hasContent = canvas.getObjects().length > 0;
    
    // 如果有内容，显示确认对话框
    if (hasContent) {
        if (!confirm('更改壁纸尺寸会清空当前画布内容，确定要继续吗？')) {
            return; // 用户取消了操作
        }
        
        // 清空画布内容
        canvas.clear();
    }
        
        // 更新尺寸
        canvasWidth = width;
        canvasHeight = height;
        
        // 调整canvas元素的CSS样式
        if (canvas && canvas.wrapperEl) {
            adjustCanvasCSS();
        }
        
    // 启用自动缩放以确保新尺寸的画布能正确显示
            autoFitZoom = true;
        
        updateCanvasSize();
    
    // 设置默认背景颜色
    const bgType = document.querySelector('input[name="bg-type"]:checked').value;
    if (bgType === 'solid') {
        const solidColorPicker = document.getElementById('solid-color-picker');
        const backgroundColor = solidColorPicker.value;
        canvas.setBackgroundColor(backgroundColor, canvas.renderAll.bind(canvas));
    } else {
        updateBackground(); // 更新渐变背景以适应新尺寸
    }
    
    // 清除选择状态
    onSelectionCleared();
        
        // 更新尺寸信息显示
        updateCanvasInfo();
}

// 添加图形元素
function addShape(shapeType) {
    try {
        let shape;
        // 获取画布中心点
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // 默认尺寸和颜色
        const defaultSize = Math.min(canvasWidth, canvasHeight) * 0.2;
        const defaultColor = '#000000';
        
        switch(shapeType) {
            case 'rectangle':
                shape = new fabric.Rect({
                    width: defaultSize,
                    height: defaultSize,
                    fill: defaultColor
                });
                break;
                
            case 'circle':
                shape = new fabric.Circle({
                    radius: defaultSize / 2,
                    fill: defaultColor
                });
                break;
                
            case 'triangle':
                shape = new fabric.Triangle({
                    width: defaultSize,
                    height: defaultSize,
                    fill: defaultColor
                });
                break;
                
            case 'line':
                shape = new fabric.Line([
                    -defaultSize / 2, 0,
                    defaultSize / 2, 0
                ], {
                    stroke: defaultColor,
                    strokeWidth: 5
                });
                break;
                
            default:
                console.warn(`未知的图形类型: ${shapeType}`);
                return;
        }
        
        // 设置元素为可选中、可拖动
        shape.set({
            left: centerX,
            top: centerY,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            hasBorders: true
        });
        
        // 添加到画布并重新渲染
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
        
        // 滚动到画布中央确保可见
        shape.viewportCenter();
        canvas.renderAll();
        
        // 触发选择事件以显示属性面板
        onObjectSelected({ selected: [shape] });
        
    } catch (error) {
        console.error(`添加图形时出错: ${error.message}`);
    }
}

// 对象选择事件处理
function onObjectSelected(e) {
    selectedElement = e.selected[0];
    
    // 显示属性控制面板内容，隐藏提示信息
    document.getElementById('no-selection-tip').style.display = 'none';
    document.getElementById('element-controls-content').style.display = 'block';
    
    // 更新属性控制面板的值
    updateElementControls();
}

// 新增：更新控制面板上的值以匹配选中元素的当前属性
function updateElementControls() {
    if (!selectedElement) return;
    
        // 更新颜色选择器
        if (selectedElement.fill && selectedElement.fill !== 'transparent') {
            document.getElementById('element-color').value = selectedElement.fill;
        } else if (selectedElement.stroke) {
            document.getElementById('element-color').value = selectedElement.stroke;
        }
        
        // 更新透明度滑块
        const opacity = selectedElement.opacity || 1;
        document.getElementById('element-opacity').value = opacity * 100;
        document.getElementById('opacity-value').textContent = `${Math.round(opacity * 100)}%`;
        
    // 更新大小滑块
        let size = 100;
    if (selectedElement.type === 'circle') {
            size = selectedElement.radius * 2;
    } else if (selectedElement.type === 'rect' || selectedElement.type === 'triangle') {
        if (selectedElement.scaleX) {
            size = selectedElement.width * selectedElement.scaleX;
        } else {
            size = selectedElement.width;
        }
    } else if (selectedElement.type === 'line') {
        if (selectedElement.scaleX) {
            const lineLength = Math.sqrt(
                Math.pow(selectedElement.x2 - selectedElement.x1, 2) + 
                Math.pow(selectedElement.y2 - selectedElement.y1, 2)
            );
            size = lineLength * selectedElement.scaleX;
        } else {
            size = 100; // 默认线长
        }
    }
    
    document.getElementById('element-size').value = Math.round(size);
        document.getElementById('size-value').textContent = `${Math.round(size)}px`;
        
        // 更新旋转滑块
        const angle = selectedElement.angle || 0;
        document.getElementById('element-rotation').value = angle;
        document.getElementById('rotation-value').textContent = `${Math.round(angle)}°`;
}

// 清除选择事件处理
function onSelectionCleared() {
    selectedElement = null;
    
    // 显示提示信息，隐藏属性控制面板内容
    document.getElementById('no-selection-tip').style.display = 'block';
    document.getElementById('element-controls-content').style.display = 'none';
}

// 更新元素属性
function updateElementProperties() {
    if (!selectedElement) return;
    
    // 更新颜色
    const color = document.getElementById('element-color').value;
    if (selectedElement.type === 'line') {
        selectedElement.set('stroke', color);
    } else {
        selectedElement.set('fill', color);
    }
    
    // 更新透明度
    const opacity = parseInt(document.getElementById('element-opacity').value) / 100;
    selectedElement.set('opacity', opacity);
    document.getElementById('opacity-value').textContent = `${Math.round(opacity * 100)}%`;
    
    // 更新大小
    const size = parseInt(document.getElementById('element-size').value);
    document.getElementById('size-value').textContent = `${size}px`;
    
    if (selectedElement.type === 'circle') {
        selectedElement.set('radius', size / 2);
    } else if (selectedElement.type === 'rect' || selectedElement.type === 'triangle') {
        // 保持原始宽高比
        const originalWidth = selectedElement.width || 1;
        const scale = size / originalWidth;
        selectedElement.set({
            scaleX: scale,
            scaleY: scale
        });
    } else if (selectedElement.type === 'line') {
        // 对于线条，我们只改变其长度，不改变方向
        const dx = selectedElement.x2 - selectedElement.x1;
        const dy = selectedElement.y2 - selectedElement.y1;
        const currentLength = Math.sqrt(dx * dx + dy * dy);
        const scale = currentLength ? size / currentLength : 1;
        selectedElement.set('scaleX', scale);
    }
    
    // 更新旋转
    const angle = parseInt(document.getElementById('element-rotation').value);
    selectedElement.set('angle', angle);
    document.getElementById('rotation-value').textContent = `${angle}°`;
    
    // 重新渲染画布
    canvas.renderAll();
}

// 图层控制 - 上移一层
function bringForward() {
    if (!selectedElement) return;
    
    try {
        // 检查是否存在该方法
        if (typeof canvas.bringForward === 'function') {
    canvas.bringForward(selectedElement);
        } else {
            // 获取当前索引，移动到更高一层
            const currentIndex = canvas.getObjects().indexOf(selectedElement);
            selectedElement.moveTo(currentIndex + 1);
        }
    canvas.renderAll();
    } catch (error) {
        console.error('上移图层时出错:', error);
    }
}

// 图层控制 - 下移一层
function sendBackward() {
    if (!selectedElement) return;
    
    try {
        // 检查是否存在该方法
        if (typeof canvas.sendBackward === 'function') {
    canvas.sendBackward(selectedElement);
        } else {
            // 获取当前索引，移动到更低一层
            const currentIndex = canvas.getObjects().indexOf(selectedElement);
            if (currentIndex > 0) { // 确保不是最底层
                selectedElement.moveTo(currentIndex - 1);
            }
        }
    canvas.renderAll();
    } catch (error) {
        console.error('下移图层时出错:', error);
    }
}

// 删除元素
function deleteElement() {
    if (!selectedElement) return;
    canvas.remove(selectedElement);
    selectedElement = null;
    document.getElementById('element-properties').style.display = 'none';
    canvas.renderAll();
}

// 设置本地存储
function setupLocalStorage() {
    // 初始化本地存储
    if (!localStorage.getItem('wallpaperDesigns')) {
        localStorage.setItem('wallpaperDesigns', JSON.stringify([]));
    }
}

// 保存设计
function saveDesign() {
    if (!canvas) return;
    
    const designName = prompt('请输入设计名称:', '我的壁纸 ' + new Date().toLocaleString());
    if (!designName) return;
    
    try {
        const design = {
            id: Date.now(),
            name: designName,
            width: canvasWidth,
            height: canvasHeight,
            json: JSON.stringify(canvas.toJSON()),
            thumbnail: canvas.toDataURL({
                format: 'jpeg',
                quality: 0.3,
                multiplier: 0.1
            }),
            date: new Date().toISOString()
        };
        
        const designs = JSON.parse(localStorage.getItem('wallpaperDesigns') || '[]');
        designs.push(design);
        localStorage.setItem('wallpaperDesigns', JSON.stringify(designs));
        
        alert('设计已保存!');
    } catch (error) {
        console.error('保存设计时出错:', error);
        alert('保存失败，请稍后重试。');
    }
}

// 显示下载模态框
function showDownloadModal() {
    document.getElementById('download-modal').style.display = 'block';
    updateQualityValue();
}

// 更新质量值显示
function updateQualityValue() {
    const quality = parseFloat(document.getElementById('download-quality').value);
    document.getElementById('quality-value').textContent = `${Math.round(quality * 100)}%`;
}

// 下载壁纸
function downloadWallpaper() {
    if (!canvas) return;
    
    const format = document.getElementById('download-format').value;
    const quality = parseFloat(document.getElementById('download-quality').value);
    const filename = document.getElementById('download-filename').value || '极简壁纸';
    
    try {
        // 导出图像
        const dataURL = canvas.toDataURL({
            format: format === 'jpg' ? 'jpeg' : format,
            quality: quality,
            multiplier: 1
        });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `${filename}.${format}`;
        link.click();
        
        // 关闭模态框
        document.getElementById('download-modal').style.display = 'none';
    } catch (error) {
        console.error('下载壁纸时出错:', error);
        alert('下载失败，请稍后重试。');
    }
}

// 在活动节点和下一个节点之间添加新的节点
function addStopBetweenActive() {
    // 如果没有活动的节点，使用第一个
    if (activeStopIndex === -1 && gradientStops.length > 0) {
        activeStopIndex = 0;
    }
    
    // 如果活动节点存在且不是最后一个
    if (activeStopIndex >= 0 && activeStopIndex < gradientStops.length - 1) {
        const leftStop = gradientStops[activeStopIndex];
        const rightStop = gradientStops[activeStopIndex + 1];
        const offset = (leftStop.offset + rightStop.offset) / 2;
        const color = interpolateColor(leftStop.color, rightStop.color, 0.5);
        
        // 添加新的节点
        addGradientStop(offset, color);
    } else if (activeStopIndex === gradientStops.length - 1) {
        // 如果活动节点是最后一个，添加到它和右边界之间
        const leftStop = gradientStops[activeStopIndex];
        const offset = (leftStop.offset + 1) / 2;
        addGradientStop(offset, leftStop.color);
    } else if (gradientStops.length >= 2) {
        // 没有活动的节点，但有至少两个节点
        const offset = (gradientStops[0].offset + gradientStops[1].offset) / 2;
        const color = interpolateColor(gradientStops[0].color, gradientStops[1].color, 0.5);
        addGradientStop(offset, color);
    }
}

// 删除当前选中的渐变节点
function deleteActiveGradientStop() {
    // 如果没有激活的节点或节点总数少于等于2，则不执行删除
    if (activeStopIndex === -1 || gradientStops.length <= 2) {
        if (gradientStops.length <= 2) {
            alert('至少需要两个渐变节点');
        }
        return;
    }
    
    // 删除激活的节点
    gradientStops.splice(activeStopIndex, 1);
    
    // 重置激活节点索引
    activeStopIndex = -1;
    
    // 更新UI和背景
    renderGradientStops();
    updateGradientPreview();
    updateBackground();
} 