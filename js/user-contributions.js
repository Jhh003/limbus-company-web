
import { DeleteButton } from './components/DeleteButton.js';
import { ConfirmDialog } from './components/ConfirmDialog.js';
import { AuthModule } from './modules/authModule.js';

class UserContributions {
    constructor() {
        this.listContainer = document.getElementById('content-list');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.emptyState = document.getElementById('empty-state');
        this.confirmDialog = new ConfirmDialog();
        
        this.init();
    }
    
    async init() {
        // Initialize Auth (this handles nav dropdown too)
        AuthModule.init({
            onUserChange: (user) => {
                if (!user) {
                    window.location.href = '/';
                } else {
                    this.loadData();
                }
            }
        });
        
        // Wait for auth check
        setTimeout(() => {
            const user = AuthModule.getCurrentUser();
            if (!user) {
                // AuthModule will handle redirect or we can show login
                // For now, let's assume auth module handles initialization
            } else {
                this.loadData();
            }
        }, 500);
    }
    
    async loadData() {
        this.showLoading(true);
        this.listContainer.innerHTML = '';
        this.emptyState.style.display = 'none';
        
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/user/contributions', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                this.renderList(result.data.list);
            } else {
                this.showToast(result.message || '加载失败', 'error');
            }
        } catch (error) {
            console.error('Failed to load contributions:', error);
            this.showToast('网络错误，请稍后重试', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    renderList(items) {
        if (!items || items.length === 0) {
            this.emptyState.style.display = 'block';
            return;
        }
        
        items.forEach(item => {
            const el = this.createItemElement(item);
            this.listContainer.appendChild(el);
        });
    }
    
    createItemElement(item) {
        const div = document.createElement('div');
        div.className = 'content-item';
        
        const isGuide = item.type === 'guide';
        const typeLabel = isGuide ? '攻略' : '排行';
        const badgeClass = isGuide ? 'badge-guide' : 'badge-ranking';
        
        const statusMap = {
            'pending': { text: '审核中', class: 'status-pending' },
            'approved': { text: '已发布', class: 'status-approved' },
            'rejected': { text: '已驳回', class: 'status-rejected' }
        };
        const statusInfo = statusMap[item.status] || { text: item.status, class: '' };
        
        const date = new Date(item.created_at).toLocaleString('zh-CN');
        
        // Title logic
        let title = '';
        if (isGuide) {
            title = item.title;
        } else {
            title = `${item.sinner} - ${item.persona} (${this.formatTime(item.time)})`;
        }
        
        div.innerHTML = `
            <div class="item-main">
                <div>
                    <span class="item-type-badge ${badgeClass}">${typeLabel}</span>
                    <span class="item-status ${statusInfo.class}">${statusInfo.text}</span>
                </div>
                <div class="item-title">${title}</div>
                <div class="item-meta">
                    <span><i class="far fa-clock"></i> ${date}</span>
                    ${isGuide ? `<span><i class="fas fa-user"></i> ${item.sinner}</span>` : ''}
                </div>
            </div>
            <div class="item-actions"></div>
        `;
        
        // Add Delete Button
        const actionsContainer = div.querySelector('.item-actions');
        const deleteBtn = new DeleteButton({
            onClick: () => this.handleDelete(item, title)
        });
        deleteBtn.mount(actionsContainer);
        
        return div;
    }
    
    async handleDelete(item, title) {
        const confirmed = await this.confirmDialog.show({
            title: '删除确认',
            message: '确定要删除 [itemName] 吗？此操作不可恢复',
            itemName: title
        });
        
        if (!confirmed) return;
        
        const loading = this.showGlobalLoading();
        
        try {
            const token = localStorage.getItem('auth_token');
            // Check request timing
            const startTime = Date.now();
            
            const response = await fetch(`/api/user/content/${item.type}/${item.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            // Log timing
            console.log(`Delete request took ${Date.now() - startTime}ms`);
            
            if (result.code === 200) {
                this.showToast('删除成功', 'success');
                this.loadData(); // Refresh list
            } else {
                this.showToast(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            this.showToast('删除失败：网络错误', 'error');
        } finally {
            loading.remove();
        }
    }
    
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}分${s}秒`;
    }
    
    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    
    showGlobalLoading() {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.background = 'rgba(0,0,0,0.5)';
        div.style.zIndex = '9999';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--lc-gold); font-size:3rem;"></i>';
        document.body.appendChild(div);
        return div;
    }
    
    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Trigger reflow
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Initialize
new UserContributions();
