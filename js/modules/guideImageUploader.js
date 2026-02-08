/**
 * 攻略正文图片上传管理模块
 * 支持多图上传、长图预览、拖拽排序、图片替换/删除
 */

import { logger } from '../core/logger.js';

// 使用全局 API_BASE 或回退到相对路径
const API_BASE = window.API_BASE || '/api';
const UPLOAD_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * 正文图片管理器类
 */
export class GuideContentImageManager {
    constructor(options = {}) {
        this.images = [];
        this.onChange = options.onChange || (() => {});
        this.containerId = options.containerId || 'content-images-grid';
        this.uploadAreaId = options.uploadAreaId || 'content-images-upload-area';
        this.progressAreaId = options.progressAreaId || 'content-images-progress';
        this.inputId = options.inputId || 'content-images-file';
        
        this.draggedIndex = null;
        this.isUploading = false;
    }

    /**
     * 初始化上传区域事件
     */
    init() {
        const uploadArea = document.getElementById(this.uploadAreaId);
        const input = document.getElementById(this.inputId);
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        if (input) {
            input.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        logger.info('[GuideImageManager] 初始化完成');
    }

    /**
     * 创建图片项HTML
     */
    createImageItem(imageData, index) {
        const { url, name, uploading, progress, error, width, height } = imageData;
        const isLongImage = height && width && (height / width > 2);
        
        const container = document.createElement('div');
        container.className = 'content-image-item';
        container.dataset.index = index;
        container.draggable = !uploading;
        container.style.cssText = `
            position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--lc-border);
            background:var(--lc-bg-secondary);cursor:${uploading ? 'default' : 'move'};
            transition:all 0.2s;animation:scaleIn 0.25s ease;
        `;
        
        if (!uploading) {
            container.addEventListener('dragstart', (e) => this.handleItemDragStart(e, index));
            container.addEventListener('dragover', (e) => this.handleItemDragOver(e));
            container.addEventListener('drop', (e) => this.handleItemDrop(e, index));
            container.addEventListener('dragenter', (e) => this.handleItemDragEnter(e));
            container.addEventListener('dragleave', (e) => this.handleItemDragLeave(e));
            container.addEventListener('mouseenter', () => {
                const actions = container.querySelector('.content-image-actions');
                if (actions) actions.style.opacity = '1';
            });
            container.addEventListener('mouseleave', () => {
                const actions = container.querySelector('.content-image-actions');
                if (actions) actions.style.opacity = '0';
            });
        }
        
        if (uploading) {
            container.innerHTML = `
                <div style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;">
                    <div style="font-size:1.5rem;color:var(--lc-gold);margin-bottom:8px;">${Math.round(progress || 0)}%</div>
                    <div style="width:60px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
                        <div style="height:100%;width:${progress || 0}%;background:linear-gradient(90deg,var(--lc-gold),#b8942d);transition:width 0.3s;"></div>
                    </div>
                </div>
            `;
        } else if (error) {
            container.innerHTML = `
                <div style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;color:var(--lc-red);">
                    <i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:8px;"></i>
                    <div style="font-size:0.75rem;text-align:center;">上传失败</div>
                    <button onclick="this.closest('.content-image-item').querySelector('.retry-btn').click()" 
                            style="margin-top:8px;padding:4px 12px;background:var(--lc-gold);border:none;border-radius:4px;color:#1a1a2e;font-size:0.75rem;cursor:pointer;">
                        重试
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="position:relative;${isLongImage ? 'height:150px;overflow-y:auto;overflow-x:hidden;' : 'aspect-ratio:1;'}">
                    <img src="${url}" alt="${name || '图片'}" 
                         style="width:100%;${isLongImage ? 'height:auto;min-height:100%;' : 'height:100%;object-fit:cover;'}display:block;"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🖼️</text></svg>'">
                    ${isLongImage ? `
                        <div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.7);color:#fff;padding:2px 6px;border-radius:4px;font-size:0.65rem;">
                            <i class="fas fa-arrows-alt-v"></i> 长图
                        </div>
                    ` : ''}
                </div>
                <div class="content-image-actions" style="position:absolute;top:4px;right:4px;display:flex;gap:4px;opacity:0;transition:opacity 0.2s;background:rgba(0,0,0,0.5);padding:4px;border-radius:6px;">
                    <button type="button" class="view-btn" title="查看大图"
                            style="width:24px;height:24px;background:rgba(255,255,255,0.9);border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;">
                        <i class="fas fa-eye" style="font-size:11px;"></i>
                    </button>
                    <button type="button" class="replace-btn" title="替换图片"
                            style="width:24px;height:24px;background:rgba(255,255,255,0.9);border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;">
                        <i class="fas fa-sync-alt" style="font-size:11px;"></i>
                    </button>
                    <button type="button" class="delete-btn" title="删除图片"
                            style="width:24px;height:24px;background:rgba(201,79,79,0.9);border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;">
                        <i class="fas fa-trash" style="font-size:11px;"></i>
                    </button>
                </div>
                <div style="position:absolute;bottom:4px;left:4px;background:rgba(201,169,97,0.9);color:#1a1a2e;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:600;">
                    ${index + 1}
                </div>
            `;
            
            // 绑定按钮事件
            container.querySelector('.view-btn').addEventListener('click', () => this.viewImage(index));
            container.querySelector('.replace-btn').addEventListener('click', () => this.replaceImage(index));
            container.querySelector('.delete-btn').addEventListener('click', () => this.deleteImage(index));
        }
        
        return container;
    }

    /**
     * 渲染图片网格
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = '';
        this.images.forEach((img, idx) => {
            container.appendChild(this.createImageItem(img, idx));
        });
        
        this.onChange(this.getValidImages());
    }

    /**
     * 处理文件选择
     */
    async handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        await this.uploadFiles(files);
        event.target.value = '';
    }

    /**
     * 验证并上传文件
     */
    async uploadFiles(files) {
        const validFiles = [];
        
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                this.showMessage(`「${file.name}」不是有效的图片文件`, 'warning');
                continue;
            }
            if (file.size > UPLOAD_CONFIG.maxFileSize) {
                this.showMessage(`「${file.name}」超过10MB限制`, 'warning');
                continue;
            }
            validFiles.push(file);
        }
        
        if (validFiles.length === 0) return;
        
        // 添加到列表（上传中状态）
        const startIndex = this.images.length;
        validFiles.forEach((file, idx) => {
            this.images.push({
                file: file,
                url: URL.createObjectURL(file),
                name: file.name,
                size: file.size,
                uploading: true,
                progress: 0,
                tempId: Date.now() + idx
            });
        });
        
        this.render();
        this.showProgress(true);
        
        // 并行上传
        let completed = 0;
        const uploadPromises = validFiles.map((file, idx) => {
            const imageIndex = startIndex + idx;
            return this.uploadSingleFile(file, imageIndex, (progress) => {
                this.images[imageIndex].progress = progress;
                this.render();
            }).then(() => {
                completed++;
                this.updateTotalProgress(completed, validFiles.length);
            });
        });
        
        try {
            await Promise.all(uploadPromises);
            this.showMessage(`成功上传 ${validFiles.length} 张图片`, 'success');
        } catch (error) {
            logger.error('[GuideImageManager] 批量上传失败:', error);
            this.showMessage('部分图片上传失败', 'error');
        } finally {
            setTimeout(() => this.showProgress(false), 1000);
        }
    }

    /**
     * 单文件上传
     */
    async uploadSingleFile(file, index, onProgress) {
        const formData = new FormData();
        formData.append('image', file);
        
        // 获取用户 token
        const user = JSON.parse(localStorage.getItem('limbus_user') || 'null');
        const headers = {};
        if (user && user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }
        
        // 模拟进度
        let progress = 0;
        const interval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 15;
                onProgress(Math.min(progress, 90));
            }
        }, 200);
        
        try {
            const response = await fetch(`${API_BASE}/upload/image`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            clearInterval(interval);
            
            const result = await response.json();
            
            if (result.code === 200 && result.success) {
                const dimensions = await this.getImageDimensions(result.data.url);
                
                // 释放临时URL
                if (this.images[index].url && this.images[index].url.startsWith('blob:')) {
                    URL.revokeObjectURL(this.images[index].url);
                }
                
                this.images[index] = {
                    url: result.data.url,
                    name: file.name,
                    size: file.size,
                    uploading: false,
                    progress: 100,
                    width: dimensions.width,
                    height: dimensions.height,
                    isLongImage: dimensions.height / dimensions.width > 2
                };
                
                onProgress(100);
                this.render();
                return result.data.url;
            } else {
                throw new Error(result.message || '上传失败');
            }
        } catch (error) {
            clearInterval(interval);
            this.images[index].uploading = false;
            this.images[index].error = true;
            this.render();
            throw error;
        }
    }

    /**
     * 获取图片尺寸
     */
    getImageDimensions(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
                resolve({ width: 0, height: 0 });
            };
            img.src = url;
        });
    }

    /**
     * 查看大图
     */
    viewImage(index) {
        const image = this.images[index];
        if (!image || !image.url) return;
        
        const modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:10000;
            display:flex;align-items:center;justify-content:center;padding:20px;
            animation:fadeIn 0.2s ease;
        `;
        modal.innerHTML = `
            <div style="position:relative;max-width:95%;max-height:95%;overflow:auto;">
                <img src="${image.url}" style="max-width:100%;max-height:90vh;display:block;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                <div style="text-align:center;color:#fff;margin-top:12px;font-size:0.9rem;opacity:0.8;">
                    ${image.name || '图片'} (${index + 1}/${this.images.length})
                    ${image.width && image.height ? ` · ${image.width}×${image.height}` : ''}
                </div>
            </div>
            <button class="close-viewer" style="position:absolute;top:20px;right:20px;width:44px;height:44px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;color:#fff;cursor:pointer;font-size:1.3rem;transition:all 0.2s;">
                ✕
            </button>
            <button class="prev-image" style="position:absolute;left:20px;top:50%;transform:translateY(-50%);width:50px;height:50px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;color:#fff;cursor:pointer;font-size:1.5rem;${index === 0 ? 'display:none;' : ''}">
                ‹
            </button>
            <button class="next-image" style="position:absolute;right:20px;top:50%;transform:translateY(-50%);width:50px;height:50px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;color:#fff;cursor:pointer;font-size:1.5rem;${index === this.images.length - 1 ? 'display:none;' : ''}">
                ›
            </button>
        `;
        
        const closeModal = () => modal.remove();
        
        modal.querySelector('.close-viewer').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        modal.querySelector('.prev-image')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index > 0) {
                modal.remove();
                this.viewImage(index - 1);
            }
        });
        
        modal.querySelector('.next-image')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index < this.images.length - 1) {
                modal.remove();
                this.viewImage(index + 1);
            }
        });
        
        document.body.appendChild(modal);
    }

    /**
     * 替换图片
     */
    replaceImage(index) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!this.validateFile(file)) return;
            
            this.images[index].uploading = true;
            this.images[index].progress = 0;
            this.images[index].error = false;
            this.render();
            
            try {
                await this.uploadSingleFile(file, index, (p) => {
                    this.images[index].progress = p;
                    this.render();
                });
                this.showMessage('图片替换成功', 'success');
            } catch (error) {
                this.showMessage('替换失败: ' + error.message, 'error');
            }
        };
        input.click();
    }

    /**
     * 删除图片
     */
    deleteImage(index) {
        if (!confirm('确定要删除这张图片吗？')) return;
        
        // 释放临时URL
        if (this.images[index].url && this.images[index].url.startsWith('blob:')) {
            URL.revokeObjectURL(this.images[index].url);
        }
        
        this.images.splice(index, 1);
        this.render();
    }

    /**
     * 验证文件
     */
    validateFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showMessage('请上传图片文件', 'warning');
            return false;
        }
        if (file.size > UPLOAD_CONFIG.maxFileSize) {
            this.showMessage('图片大小不能超过10MB', 'warning');
            return false;
        }
        return true;
    }

    /**
     * 获取有效图片列表
     */
    getValidImages() {
        return this.images
            .filter(img => !img.uploading && img.url && !img.url.startsWith('blob:'))
            .map(img => ({
                url: img.url,
                width: img.width,
                height: img.height,
                isLongImage: img.isLongImage,
                name: img.name
            }));
    }

    /**
     * 批量拖拽上传
     */
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--lc-gold)';
        e.currentTarget.style.background = 'rgba(201,169,97,0.05)';
    }

    handleDragLeave(e) {
        e.currentTarget.style.borderColor = 'rgba(201,169,97,0.3)';
        e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'rgba(201,169,97,0.3)';
        e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
        
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            this.uploadFiles(files);
        }
    }

    /**
     * 图片项拖拽排序
     */
    handleItemDragStart(e, index) {
        this.draggedIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    }

    handleItemDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleItemDragEnter(e) {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--lc-gold)';
        e.currentTarget.style.transform = 'scale(1.05)';
    }

    handleItemDragLeave(e) {
        e.currentTarget.style.borderColor = 'var(--lc-border)';
        e.currentTarget.style.transform = 'scale(1)';
    }

    handleItemDrop(e, dropIndex) {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--lc-border)';
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.opacity = '1';
        
        if (this.draggedIndex === null || this.draggedIndex === dropIndex) return;
        
        const temp = this.images[this.draggedIndex];
        this.images.splice(this.draggedIndex, 1);
        this.images.splice(dropIndex, 0, temp);
        
        this.draggedIndex = null;
        this.render();
    }

    /**
     * 显示/隐藏进度条
     */
    showProgress(show) {
        const progressArea = document.getElementById(this.progressAreaId);
        if (progressArea) {
            progressArea.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * 更新总进度
     */
    updateTotalProgress(completed, total) {
        const percentEl = document.getElementById('content-images-percent');
        const barEl = document.getElementById('content-images-progress-bar');
        const statusEl = document.getElementById('content-images-upload-status');
        
        const percent = Math.round((completed / total) * 100);
        if (percentEl) percentEl.textContent = percent + '%';
        if (barEl) barEl.style.width = percent + '%';
        if (statusEl) statusEl.textContent = `已上传 ${completed}/${total}`;
    }

    /**
     * 显示消息（使用外部showMessage或console）
     */
    showMessage(message, type = 'info') {
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else {
            logger.info(`[GuideImageManager] ${message}`);
        }
    }

    /**
     * 清空所有图片
     */
    clear() {
        this.images.forEach(img => {
            if (img.url && img.url.startsWith('blob:')) {
                URL.revokeObjectURL(img.url);
            }
        });
        this.images = [];
        this.render();
    }

    /**
     * 从URL列表加载图片
     */
    loadFromUrls(urls) {
        this.clear();
        urls.forEach((url, idx) => {
            this.images.push({
                url: url,
                name: `图片${idx + 1}`,
                uploading: false,
                width: 0,
                height: 0
            });
        });
        this.render();
    }
}

// 导出默认实例创建函数
export function createGuideImageManager(options) {
    return new GuideContentImageManager(options);
}
