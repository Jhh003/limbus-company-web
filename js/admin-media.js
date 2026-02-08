
/**
 * Admin Media Preview Module
 * Handles image and video previews for admin audit pages.
 */

class MediaPreview {
    constructor() {
        this.initModal();
    }

    initModal() {
        // Check if modal already exists
        if (document.getElementById('media-preview-modal')) return;

        const modalHtml = `
            <div id="media-preview-modal" class="media-modal">
                <div class="media-modal-content">
                    <button class="media-modal-close" onclick="MediaPreview.close()">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="media-modal-body" id="media-preview-container">
                        <!-- Media content will be injected here -->
                    </div>
                    <div class="media-modal-footer" id="media-modal-footer" style="display:none;">
                         <div class="media-controls">
                            <button onclick="MediaPreview.rotate(-90)"><i class="fas fa-undo"></i></button>
                            <button onclick="MediaPreview.rotate(90)"><i class="fas fa-redo"></i></button>
                            <span id="media-scale-info">100%</span>
                         </div>
                    </div>
                </div>
            </div>
            <style>
                .media-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 2000;
                    justify-content: center;
                    align-items: center;
                }
                .media-modal.active {
                    display: flex;
                }
                .media-modal-content {
                    position: relative;
                    max-width: 90%;
                    max-height: 90%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .media-modal-close {
                    position: absolute;
                    top: -40px;
                    right: -40px;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 30px;
                    cursor: pointer;
                }
                .media-modal-body {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                }
                .media-modal-body img {
                    max-width: 100%;
                    max-height: 80vh;
                    transition: transform 0.3s ease;
                    cursor: grab;
                }
                .media-modal-body video {
                    max-width: 100%;
                    max-height: 80vh;
                }
                .media-modal-footer {
                    margin-top: 20px;
                    color: white;
                }
                .media-controls button {
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.4);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 0 5px;
                }
                .media-controls button:hover {
                    background: rgba(255,255,255,0.4);
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Bind static methods to instance for easy access if needed, 
        // but mostly we use the static methods defined below.
        window.MediaPreviewInstance = this;
    }

    static open(url, type) {
        const modal = document.getElementById('media-preview-modal');
        const container = document.getElementById('media-preview-container');
        const footer = document.getElementById('media-modal-footer');
        
        container.innerHTML = '<div style="color:white"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';
        modal.classList.add('active');
        
        // Reset transformation
        this.currentScale = 1;
        this.currentRotation = 0;

        let content = '';
        
        if (type === 'video' || url.match(/\.(mp4|webm|mov)$/i)) {
            content = `
                <video controls autoplay>
                    <source src="${url}" type="video/mp4">
                    您的浏览器不支持视频播放。
                </video>
            `;
            footer.style.display = 'none';
        } else if (type === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            const img = new Image();
            img.onload = () => {
                container.innerHTML = '';
                container.appendChild(img);
                // Enable zoom/drag for image
                this.enableImageInteraction(img);
            };
            img.onerror = () => {
                container.innerHTML = '<div style="color:red"><i class="fas fa-exclamation-triangle"></i> 图片加载失败</div>';
            };
            img.src = url;
            img.id = 'preview-image';
            footer.style.display = 'block';
            return; // Async load handled
        } else {
            // Fallback for generic URL or iframe
             content = `
                <div style="background:white; width:80vw; height:80vh;">
                    <iframe src="${url}" width="100%" height="100%" frameborder="0"></iframe>
                </div>
            `;
            footer.style.display = 'none';
        }

        container.innerHTML = content;
    }

    static close() {
        const modal = document.getElementById('media-preview-modal');
        modal.classList.remove('active');
        document.getElementById('media-preview-container').innerHTML = '';
    }

    static rotate(deg) {
        this.currentRotation = (this.currentRotation || 0) + deg;
        this.updateTransform();
    }
    
    static updateTransform() {
        const img = document.getElementById('preview-image');
        if (img) {
            img.style.transform = `rotate(${this.currentRotation}deg) scale(${this.currentScale})`;
        }
    }

    static enableImageInteraction(img) {
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;

        img.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.currentScale = Math.max(0.1, (this.currentScale || 1) + delta);
            this.updateTransform();
            document.getElementById('media-scale-info').textContent = Math.round(this.currentScale * 100) + '%';
        });
        
        // Basic drag implementation (can be improved)
        img.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            img.style.cursor = 'grabbing';
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
            if(img) img.style.cursor = 'grab';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            // Note: mixing translate with rotate/scale in a simple transform string is tricky. 
            // For now, we'll stick to simple rotate/scale for the MVP requirement.
        });
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new MediaPreview();
    
    // Bind global function for inline onclick handlers
    window.previewMedia = (url, type) => MediaPreview.open(url, type);
});
