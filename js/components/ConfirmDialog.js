
// Confirm Dialog Component
export class ConfirmDialog {
    constructor() {
        this.overlay = null;
        this.resolve = null;
    }
    
    show(options) {
        return new Promise((resolve) => {
            this.resolve = resolve;
            this.render(options);
            
            // Add ESC listener
            this.escListener = (e) => {
                if (e.key === 'Escape') this.close(false);
            };
            document.addEventListener('keydown', this.escListener);
        });
    }
    
    render({ title, message, itemName }) {
        // Remove existing if any
        if (document.querySelector('.confirm-dialog-overlay')) {
            document.querySelector('.confirm-dialog-overlay').remove();
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close(false);
        };
        
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.style.background = '#1a1a1a';
        dialog.style.border = '1px solid #333';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '24px';
        dialog.style.width = '90%';
        dialog.style.maxWidth = '400px';
        dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        dialog.style.color = '#fff';
        
        const header = document.createElement('h3');
        header.textContent = title || '删除确认';
        header.style.fontSize = '18px';
        header.style.fontWeight = 'bold';
        header.style.marginBottom = '16px';
        header.style.marginTop = '0';
        
        const content = document.createElement('p');
        content.innerHTML = message.replace(itemName, `<span style="color:#d4af37; font-weight:bold;">${itemName}</span>`);
        content.style.fontSize = '14px';
        content.style.lineHeight = '1.5';
        content.style.marginBottom = '24px';
        content.style.color = '#ccc';
        
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '12px';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.padding = '8px 16px';
        cancelBtn.style.background = '#333';
        cancelBtn.style.color = '#fff';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.onclick = () => this.close(false);
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '删除';
        confirmBtn.style.padding = '8px 16px';
        confirmBtn.style.background = '#FF4444';
        confirmBtn.style.color = '#fff';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '4px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.onclick = () => this.close(true);
        
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        
        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        
        document.body.appendChild(overlay);
        this.overlay = overlay;
        
        // Trigger reflow for animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }
    
    close(result) {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.remove();
                }
                this.overlay = null;
            }, 300);
        }
        
        document.removeEventListener('keydown', this.escListener);
        if (this.resolve) this.resolve(result);
    }
}
