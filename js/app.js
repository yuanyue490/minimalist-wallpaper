// 全局变量
let canvas;
let selectedElement = null;
let canvasWidth = 1920;
let canvasHeight = 1080;
let zoomLevel = 1;

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initCanvas();
    setupEventListeners();
    setupLocalStorage();
});

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// 初始化Canvas
function initCanvas() {
    // 检查是否已加载Fabric.js
    if (typeof fabric === 'undefined') {
        // 如果没有加载，动态加载Fabric.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
        script.onload = function() {
            initFabricCanvas();
        };
        document.head.appendChild(script);
    } else {
        initFabricCanvas();
    }
}

// 使用Fabric.js初始化Canvas
function initFabricCanvas() {
    // 创建Fabric.js画布
    canvas = new fabric.Canvas('wallpaper-canvas', {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#f0f0f0',
        selection: true,
        preserveObjectStacking: true
    });
    
    // 设置画布大小
    updateCanvasSize();
    
    // 监听对象选择事件
    canvas.on('selection:created', onObjectSelected);
    canvas.on('selection:updated', onObjectSelected);
    canvas.on('selection:cleared', onSelectionCleared);
    
    // 更新画布信息
    updateCanvasInfo();
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
    
    // 计算适合容器的缩放比例，保留一些边距
    const padding = Math.min(containerWidth, containerHeight) * 0.05; // 动态边距，为容器尺寸的5%
    const scaleX = (containerWidth - padding * 2) / canvasWidth;
    const scaleY = (containerHeight - padding * 2) / canvasHeight;
    
    // 使用较小的缩放比例以保持宽高比
    zoomLevel = Math.min(scaleX, scaleY);
    
    // 应用缩放
    canvas.setZoom(zoomLevel);
    
    // 居中画布
    canvas.viewportTransform[4] = (containerWidth - canvasWidth * zoomLevel) / 2;
    canvas.viewportTransform[5] = (containerHeight - canvasHeight * zoomLevel) / 2;
    
    // 更新画布信息
    updateCanvasInfo();
    
    // 重新渲染画布
    canvas.renderAll();
}

// 更新画布信息显示
function updateCanvasInfo() {
    document.getElementById('canvas-size').textContent = `${canvasWidth} × ${canvasHeight}`;
    document.getElementById('zoom-level').textContent = `缩放: ${Math.round(zoomLevel * 100)}%`;
}

// 设置事件监听器
function setupEventListeners() {
    // 窗口大小改变时调整画布，使用防抖函数避免频繁更新
    window.addEventListener('resize', debounce(updateCanvasSize, 250));
    
    // 尺寸预设按钮
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const width = parseInt(this.dataset.width);
            const height = parseInt(this.dataset.height);
            changeCanvasSize(width, height);
        });
    });
    
    // 自定义尺寸按钮
    document.getElementById('apply-custom-size').addEventListener('click', function() {
        const width = parseInt(document.getElementById('custom-width').value);
        const height = parseInt(document.getElementById('custom-height').value);
        changeCanvasSize(width, height);
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
    document.getElementById('load-btn').addEventListener('click', showSavedDesigns);
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
    const bgType = document.querySelector('input[name="bg-type"]:checked').value;
    
    if (bgType === 'solid') {
        // 纯色背景
        const color = document.getElementById('solid-color-picker').value;
        canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas));
    } else {
        // 渐变背景
        const color1 = document.getElementById('gradient-color-1').value;
        const color2 = document.getElementById('gradient-color-2').value;
        const direction = document.getElementById('gradient-direction').value;
        const gradientType = document.getElementById('gradient-type').value;
        
        let gradient;
        
        if (gradientType === 'linear') {
            // 线性渐变
            let coords;
            
            switch (direction) {
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
            
            gradient = new fabric.Gradient({
                type: 'linear',
                coords: coords,
                colorStops: [
                    { offset: 0, color: color1 },
                    { offset: 1, color: color2 }
                ]
            });
        } else {
            // 径向渐变
            gradient = new fabric.Gradient({
                type: 'radial',
                coords: {
                    r1: canvasWidth > canvasHeight ? canvasHeight / 2 : canvasWidth / 2,
                    r2: 0,
                    x1: canvasWidth / 2,
                    y1: canvasHeight / 2,
                    x2: canvasWidth / 2,
                    y2: canvasHeight / 2
                },
                colorStops: [
                    { offset: 0, color: color1 },
                    { offset: 1, color: color2 }
                ]
            });
        }
        
        canvas.setBackgroundColor(gradient, canvas.renderAll.bind(canvas));
    }
}

// 改变画布大小
function changeCanvasSize(width, height) {
    if (width > 0 && height > 0) {
        canvasWidth = width;
        canvasHeight = height;
        updateCanvasSize();
        updateBackground(); // 更新背景以适应新尺寸
    }
}

// 添加形状
function addShape(shapeType) {
    let shape;
    
    switch (shapeType) {
        case 'rectangle':
            shape = new fabric.Rect({
                left: canvasWidth / 2 - 50,
                top: canvasHeight / 2 - 50,
                width: 100,
                height: 100,
                fill: '#000000',
                originX: 'center',
                originY: 'center'
            });
            break;
        case 'circle':
            shape = new fabric.Circle({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                radius: 50,
                fill: '#000000',
                originX: 'center',
                originY: 'center'
            });
            break;
        case 'triangle':
            shape = new fabric.Triangle({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                width: 100,
                height: 100,
                fill: '#000000',
                originX: 'center',
                originY: 'center'
            });
            break;
        case 'line':
            shape = new fabric.Line([
                canvasWidth / 2 - 50, canvasHeight / 2,
                canvasWidth / 2 + 50, canvasHeight / 2
            ], {
                stroke: '#000000',
                strokeWidth: 5,
                originX: 'center',
                originY: 'center'
            });
            break;
    }
    
    if (shape) {
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
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
        const scale = size / (selectedElement.width || 100);
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
    if (!localStorage.getItem('wallpaperDesigns')) {
        localStorage.setItem('wallpaperDesigns', JSON.stringify([]));
    }
    updateSavedDesignsList();
}

// 保存设计
function saveDesign() {
    if (!canvas) return;
    
    const designName = prompt('请输入设计名称:', '我的壁纸 ' + new Date().toLocaleString());
    if (!designName) return;
    
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
    
    const designs = JSON.parse(localStorage.getItem('wallpaperDesigns'));
    designs.push(design);
    localStorage.setItem('wallpaperDesigns', JSON.stringify(designs));
    
    alert('设计已保存!');
    updateSavedDesignsList();
}

// 更新保存的设计列表
function updateSavedDesignsList() {
    const savedDesignsContainer = document.getElementById('saved-designs');
    const designs = JSON.parse(localStorage.getItem('wallpaperDesigns'));
    
    if (!designs || designs.length === 0) {
        savedDesignsContainer.innerHTML = '<p class="empty-state">暂无保存的设计</p>';
        return;
    }
    
    let html = '<div class="saved-designs-list">';
    designs.forEach(design => {
        html += `
            <div class="saved-design-item" data-id="${design.id}">
                <div class="design-thumbnail">
                    <img src="${design.thumbnail}" alt="${design.name}">
                </div>
                <div class="design-info">
                    <h4>${design.name}</h4>
                    <p>${design.width} × ${design.height}</p>
                    <div class="design-actions">
                        <button class="btn small load-design">加载</button>
                        <button class="btn small danger delete-design">删除</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    savedDesignsContainer.innerHTML = html;
    
    // 添加事件监听器
    document.querySelectorAll('.load-design').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.closest('.saved-design-item').dataset.id);
            loadDesign(id);
        });
    });
    
    document.querySelectorAll('.delete-design').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.closest('.saved-design-item').dataset.id);
            deleteDesign(id);
        });
    });
}

// 显示保存的设计
function showSavedDesigns() {
    updateSavedDesignsList();
}

// 加载设计
function loadDesign(id) {
    const designs = JSON.parse(localStorage.getItem('wallpaperDesigns'));
    const design = designs.find(d => d.id === id);
    
    if (!design) return;
    
    canvasWidth = design.width;
    canvasHeight = design.height;
    
    canvas.loadFromJSON(JSON.parse(design.json), function() {
        updateCanvasSize();
        canvas.renderAll();
    });
}

// 删除设计
function deleteDesign(id) {
    if (!confirm('确定要删除这个设计吗?')) return;
    
    const designs = JSON.parse(localStorage.getItem('wallpaperDesigns'));
    const updatedDesigns = designs.filter(d => d.id !== id);
    localStorage.setItem('wallpaperDesigns', JSON.stringify(updatedDesigns));
    
    updateSavedDesignsList();
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
    const format = document.getElementById('download-format').value;
    const quality = parseFloat(document.getElementById('download-quality').value);
    const filename = document.getElementById('download-filename').value || '极简壁纸';
    
    // 创建临时画布以导出全尺寸图像
    const tempCanvas = new fabric.Canvas(document.createElement('canvas'), {
        width: canvasWidth,
        height: canvasHeight
    });
    
    // 复制当前画布内容
    tempCanvas.loadFromJSON(canvas.toJSON(), function() {
        // 导出图像
        const dataURL = tempCanvas.toDataURL({
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
        
        // 销毁临时画布
        tempCanvas.dispose();
    });
} 