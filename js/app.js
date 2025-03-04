// 全局变量
let canvas;
let selectedElement = null;
let canvasWidth = 1920;
let canvasHeight = 1080;
let zoomLevel = 1;
let autoFitZoom = true; // 是否自动适应容器大小

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initCanvas();
    setupEventListeners();
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
    
    // 设置包装元素的样式
    canvasWrapper.style.width = `${canvasWidth}px`;
    canvasWrapper.style.height = `${canvasHeight}px`;
    canvasWrapper.style.position = 'relative';
    canvasWrapper.style.transformOrigin = 'center center'; // 改为从中心缩放
    
    // 确保upper-canvas和lower-canvas有相同的宽高比
    [lowerCanvas, upperCanvas].forEach(canvasEl => {
        canvasEl.style.position = 'absolute';
        canvasEl.style.width = '100%';
        canvasEl.style.height = '100%';
        canvasEl.style.top = '0';
        canvasEl.style.left = '0';
    });
}

// 更新画布大小
function updateCanvasSize() {
    // 设置画布尺寸
    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);
    
    // 计算缩放比例以适应屏幕
    const container = document.querySelector('.canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 计算适合容器的缩放比例
    const scaleX = (containerWidth - 40) / canvasWidth;
    const scaleY = (containerHeight - 40) / canvasHeight;
    const autoZoom = Math.min(scaleX, scaleY);
    
    // 如果是自动适应模式，则使用计算出的缩放比例
    if (autoFitZoom) {
        zoomLevel = autoZoom;
        // 更新滑块值
        document.getElementById('zoom-slider').value = Math.round(zoomLevel * 100);
    }
    
    // 获取canvas包装元素并应用缩放变换
    const canvasWrapper = canvas.wrapperEl;
    canvasWrapper.style.transform = `scale(${zoomLevel})`;
    
    // 设置容器中画布的居中位置
    centerCanvasInContainer();
    
    // 更新画布信息
    updateCanvasInfo();
    
    // 重新渲染画布
    canvas.renderAll();
}

// 将画布居中显示在容器中
function centerCanvasInContainer() {
    if (!canvas || !canvas.wrapperEl) return;
    
    const container = document.querySelector('.canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scaledWidth = canvasWidth * zoomLevel;
    const scaledHeight = canvasHeight * zoomLevel;
    
    const marginLeft = Math.max(0, (containerWidth - scaledWidth) / 2);
    const marginTop = Math.max(0, (containerHeight - scaledHeight) / 2);
    
    canvas.wrapperEl.style.margin = `${marginTop}px ${marginLeft}px`;
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
        
        // 应用缩放到画布包装元素
        const canvasWrapper = canvas.wrapperEl;
        canvasWrapper.style.transform = `scale(${zoomLevel})`;
        
        // 更新画布信息
        updateCanvasInfo();
    });
    
    // 重置缩放按钮事件监听
    document.getElementById('reset-zoom').addEventListener('click', function() {
        // 开启自动适应模式
        autoFitZoom = true;
        
        // 重新计算适合容器的缩放比例
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const scaleX = (containerWidth - 40) / canvasWidth;
        const scaleY = (containerHeight - 40) / canvasHeight;
        zoomLevel = Math.min(scaleX, scaleY);
        
        // 更新滑块值
        document.getElementById('zoom-slider').value = Math.round(zoomLevel * 100);
        
        // 应用缩放到画布包装元素
        const canvasWrapper = canvas.wrapperEl;
        canvasWrapper.style.transform = `scale(${zoomLevel})`;
        
        // 更新画布信息
        updateCanvasInfo();
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
    document.getElementById('gradient-color-1').addEventListener('input', updateBackground);
    document.getElementById('gradient-color-2').addEventListener('input', updateBackground);
    document.getElementById('gradient-direction').addEventListener('change', updateBackground);
    document.getElementById('gradient-type').addEventListener('change', updateBackground);
    
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
        document.getElementById('gradient-bg-controls').style.display = 'none';
    } else {
        document.getElementById('solid-bg-controls').style.display = 'none';
        document.getElementById('gradient-bg-controls').style.display = 'block';
    }
}

// 更新背景
function updateBackground() {
    try {
        const bgType = document.querySelector('input[name="bg-type"]:checked').value;
        
        if (bgType === 'solid') {
            // 纯色背景
            const solidColorPicker = document.getElementById('solid-color-picker');
            const backgroundColor = solidColorPicker.value;
            
            // 设置画布背景颜色
            canvas.setBackgroundColor(backgroundColor, canvas.renderAll.bind(canvas));
            
        } else if (bgType === 'gradient') {
            // 渐变背景
            const gradientColor1 = document.getElementById('gradient-color-1').value;
            const gradientColor2 = document.getElementById('gradient-color-2').value;
            const gradientDirection = document.getElementById('gradient-direction').value;
            const gradientType = document.getElementById('gradient-type').value;
            
            if (gradientType === 'linear') {
                // 线性渐变
                let coords;
                
                // 根据方向设置渐变坐标
                switch(gradientDirection) {
                    case 'to right':
                        coords = { x1: 0, y1: 0, x2: canvasWidth, y2: 0 };
                        break;
                    case 'to bottom':
                        coords = { x1: 0, y1: 0, x2: 0, y2: canvasHeight };
                        break;
                    case 'to bottom right':
                        coords = { x1: 0, y1: 0, x2: canvasWidth, y2: canvasHeight };
                        break;
                    case 'to bottom left':
                        coords = { x1: canvasWidth, y1: 0, x2: 0, y2: canvasHeight };
                        break;
                    default:
                        coords = { x1: 0, y1: 0, x2: canvasWidth, y2: 0 };
                }
                
                // 创建渐变
                const gradient = new fabric.Gradient({
                    type: 'linear',
                    coords: coords,
                    colorStops: [
                        { offset: 0, color: gradientColor1 },
                        { offset: 1, color: gradientColor2 }
                    ]
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
                
                // 清除现有背景
                canvas.setBackgroundColor('', canvas.renderAll.bind(canvas));
                
                // 移除之前的背景对象
                canvas.getObjects().forEach(obj => {
                    if (obj.id === 'background') {
                        canvas.remove(obj);
                    }
                });
                
                // 添加渐变背景并移至底层
                bgRect.id = 'background';
                canvas.add(bgRect);
                bgRect.moveTo(0); // 移至最底层
                canvas.renderAll();
                
            } else if (gradientType === 'radial') {
                // 径向渐变
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;
                const radius = Math.max(canvasWidth, canvasHeight) / 2;
                
                // 创建渐变
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
                    colorStops: [
                        { offset: 0, color: gradientColor1 },
                        { offset: 1, color: gradientColor2 }
                    ]
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
                
                // 清除现有背景
                canvas.setBackgroundColor('', canvas.renderAll.bind(canvas));
                
                // 移除之前的背景对象
                canvas.getObjects().forEach(obj => {
                    if (obj.id === 'background') {
                        canvas.remove(obj);
                    }
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
    if (width > 0 && height > 0) {
        // 保存旧尺寸用于比较
        const oldWidth = canvasWidth;
        const oldHeight = canvasHeight;
        
        // 更新尺寸
        canvasWidth = width;
        canvasHeight = height;
        
        // 调整canvas元素的CSS样式
        if (canvas && canvas.wrapperEl) {
            adjustCanvasCSS();
        }
        
        // 如果尺寸比例发生较大变化，强制更新自动缩放
        const oldRatio = oldWidth / oldHeight;
        const newRatio = width / height;
        if (Math.abs(oldRatio - newRatio) > 0.2) {
            autoFitZoom = true;
        }
        
        updateCanvasSize();
        updateBackground(); // 更新背景以适应新尺寸
        
        // 如果有活动对象，重新定位到中心
        if (canvas.getActiveObject()) {
            const activeObject = canvas.getActiveObject();
            activeObject.viewportCenter();
            canvas.renderAll();
        }
        
        // 更新尺寸信息显示
        updateCanvasInfo();
    }
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
        onObjectSelected({ target: shape });
        
    } catch (error) {
        console.error(`添加图形时出错: ${error.message}`);
    }
}

// 对象选择事件处理
function onObjectSelected(e) {
    selectedElement = canvas.getActiveObject();
    document.getElementById('element-properties').style.display = 'block';
    
    // 更新控制面板的值
    if (selectedElement) {
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
        
        // 更新大小滑块 (使用宽度或半径)
        let size = 100;
        if (selectedElement.width) {
            size = selectedElement.width;
        } else if (selectedElement.radius) {
            size = selectedElement.radius * 2;
        } else if (selectedElement.getScaledWidth) {
            size = selectedElement.getScaledWidth();
        }
        document.getElementById('element-size').value = size;
        document.getElementById('size-value').textContent = `${Math.round(size)}px`;
        
        // 更新旋转滑块
        const angle = selectedElement.angle || 0;
        document.getElementById('element-rotation').value = angle;
        document.getElementById('rotation-value').textContent = `${Math.round(angle)}°`;
    }
}

// 清除选择事件处理
function onSelectionCleared() {
    selectedElement = null;
    document.getElementById('element-properties').style.display = 'none';
}

// 更新元素属性
function updateElementProperties() {
    if (!selectedElement) return;
    
    // 更新颜色
    const color = document.getElementById('element-color').value;
    if (selectedElement.fill && selectedElement.fill !== 'transparent') {
        selectedElement.set('fill', color);
    } else if (selectedElement.stroke) {
        selectedElement.set('stroke', color);
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
        const scale = size / selectedElement.width;
        selectedElement.set({
            scaleX: scale,
            scaleY: scale
        });
    } else if (selectedElement.type === 'line') {
        const scale = size / 100; // 假设线条的基础长度是100
        selectedElement.set({
            scaleX: scale
        });
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
    canvas.bringForward(selectedElement);
    canvas.renderAll();
}

// 图层控制 - 下移一层
function sendBackward() {
    if (!selectedElement) return;
    canvas.sendBackward(selectedElement);
    canvas.renderAll();
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