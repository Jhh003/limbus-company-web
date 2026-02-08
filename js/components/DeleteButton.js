
// Delete Button Component
export class DeleteButton {
    constructor(config) {
        this.onClick = config.onClick;
        this.size = config.size || '24px';
        this.mobileSize = config.mobileSize || '32px';
        this.color = config.color || '#FF4444';
        
        this.element = this.create();
    }
    
    create() {
        const btn = document.createElement('button');
        btn.className = 'delete-btn';
        btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        
        // Styles
        btn.style.width = this.size;
        btn.style.height = this.size;
        btn.style.color = this.color;
        btn.style.background = 'none';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.opacity = '0';
        btn.style.transition = 'opacity 0.3s ease, transform 0.2s ease';
        btn.style.padding = '0';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.fontSize = '14px';
        
        // Mobile styles check
        if (window.matchMedia("(max-width: 768px)").matches) {
            btn.style.width = this.mobileSize;
            btn.style.height = this.mobileSize;
            btn.style.fontSize = '16px';
            btn.style.opacity = '1'; // Always visible on mobile
        }
        
        btn.onclick = (e) => {
            e.stopPropagation();
            if (this.onClick) this.onClick();
        };
        
        return btn;
    }
    
    mount(parent) {
        parent.appendChild(this.element);
        
        // Add hover effect to parent
        if (!window.matchMedia("(max-width: 768px)").matches) {
            parent.addEventListener('mouseenter', () => {
                this.element.style.opacity = '1';
            });
            parent.addEventListener('mouseleave', () => {
                this.element.style.opacity = '0';
            });
        }
    }
}
