/**
 * 全球排行榜控制器
 * 
 * 职责：
 * - 排行榜数据管理
 * - 列表渲染和更新
 * - 筛选和排序逻辑
 * - 实时更新监听（Phase 2）
 * 
 * Phase标记：
 * [Phase 1] MVP必需
 * [Phase 2] 用户认证和社交
 * [Phase 3] 数据分析
 */

import { cloudbaseAPI } from '../api/cloudbaseApi.js';
import { logger } from '../core/logger.js';
import { eventBus, GameEvents } from '../core/eventBus.js';
import { sinnerData } from '../../data/characters.js';

export class GlobalRankingController {
  constructor() {
    this.rankings = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.total = 0;

    // 筛选条件
    this.filters = {
      sinner: null,
      floorLevel: null,
      sortBy: 'time', // time, date, views(Phase 2), likes(Phase 2)
      status: 'verified'
    };

    // DOM缓存
    this.dom = {
      container: null,
      list: null,
      pagination: null,
      filterBtns: null,
      sortDropdown: null,
      loading: null,
      empty: null
    };

    // 刷新定时器 [Phase 2: 实时更新]
    this.refreshInterval = null;
    this.isWatchingUpdates = false;

    logger.info('[GlobalRankingController] 初始化完成');
  }

  /**
   * 初始化DOM和事件监听
   * @param {Object} domElements - DOM元素映射
   */
  initDOM(domElements) {
    Object.assign(this.dom, domElements);
    this.bindEvents();
    logger.info('[GlobalRankingController] DOM初始化完成');
  }

  /**
   * 绑定事件监听
   * @private
   */
  bindEvents() {
    // 筛选按钮事件
    if (this.dom.filterBtns) {
      this.dom.filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.handleFilterClick(e));
      });
    }

    // 排序下拉框事件
    if (this.dom.sortDropdown) {
      this.dom.sortDropdown.addEventListener('change', (e) => {
        this.filters.sortBy = e.target.value;
        this.currentPage = 1;
        this.loadRankings();
      });
    }

    // 分页事件
    if (this.dom.pagination) {
      this.dom.pagination.addEventListener('click', (e) => {
        const page = e.target.dataset.page;
        if (page) {
          this.currentPage = parseInt(page);
          this.loadRankings();
        }
      });
    }

    logger.info('[GlobalRankingController] 事件绑定完成');
  }

  /**
   * ==================== Phase 1: MVP 功能 ====================
   */

  /**
   * 加载排行榜数据 [Phase 1: MVP]
   */
  async loadRankings() {
    try {
      this.showLoading(true);

      const result = await cloudbaseAPI.getRankingList({
        page: this.currentPage,
        limit: this.pageSize,
        ...this.filters
      });

      this.rankings = result.records || [];
      this.total = result.pagination?.total || result.total || 0;

      this.renderRankings();
      this.renderPagination();

      logger.info('[GlobalRankingController] 排行榜加载成功，共', this.total, '条记录');
    } catch (error) {
      logger.error('[GlobalRankingController] 加载排行榜失败:', error);
      this.showError('加载排行榜失败，请稍后重试');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * 渲染排行榜列表 [Phase 1: MVP]
   * @private
   */
  renderRankings() {
    if (!this.dom.list) return;

    if (this.rankings.length === 0) {
      this.dom.list.innerHTML = '<div class="empty-state">暂无排行榜记录</div>';
      return;
    }

    this.dom.list.innerHTML = this.rankings.map((record, index) => {
      const rank = (this.currentPage - 1) * this.pageSize + index + 1;
      return this.createRankingCard(record, rank);
    }).join('');

    // 为删除按钮绑定事件 [Phase 2: 用户认证]
    this.dom.list.querySelectorAll('.ranking-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDeleteRanking(e));
    });

    // 为点赞按钮绑定事件 [Phase 2: 社交互动]
    this.dom.list.querySelectorAll('.ranking-like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleLikeRanking(e));
    });

    // 为评论按钮绑定事件 [Phase 2: 社交互动]
    this.dom.list.querySelectorAll('.ranking-comment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleViewComments(e));
    });
  }

  /**
   * 获取人格头像URL
   * @private
   */
  getPersonaAvatar(sinnerName, personaName) {
    // 查找罪人
    const sinner = sinnerData.find(s => s.name === sinnerName);
    if (!sinner || !sinner.personalities) return null;
    
    // 查找人格
    const persona = sinner.personalities.find(p => p.name === personaName);
    return persona ? persona.avatar : null;
  }

  /**
   * 创建排行榜卡片HTML [Phase 1: MVP]
   * @private
   */
  createRankingCard(record, rank) {
    const timeFormatted = this.formatTime(record.time);
    const date = new Date(record.created_at).toLocaleDateString('zh-CN');
    
    // 前三名特殊样式类
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    
    // 获取人格头像
    const personaAvatar = this.getPersonaAvatar(record.sinner, record.persona);
    const avatarHtml = personaAvatar 
      ? `<img class="sinner-icon" src="${personaAvatar}" alt="${record.persona}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="sinner-icon fallback" style="display:none; background: linear-gradient(135deg, #1a1a2e, #2d2d44); align-items: center; justify-content: center; color: var(--lc-gold); font-size: 14px;">${record.sinner ? record.sinner[0] : '?'}</div>`
      : `<div class="sinner-icon" style="background: linear-gradient(135deg, #1a1a2e, #2d2d44); display: flex; align-items: center; justify-content: center; color: var(--lc-gold); font-size: 14px;">${record.sinner ? record.sinner[0] : '?'}</div>`;

    return `
      <div class="ranking-card ${rankClass}" data-record-id="${record._id}">
        <div class="ranking-header">
          <div class="rank-badge">#${rank}</div>
          <div class="player-info">
            <div class="player-name">${this.escapeHtml(record.username)}</div>
            <div class="submit-date">${date}</div>
          </div>
        </div>

        <div class="ranking-content">
          <div class="game-info">
            ${avatarHtml}
            <div class="details">
              <div class="sinner-name">${this.escapeHtml(record.sinner)}</div>
              <div class="persona-name">${this.escapeHtml(record.persona)}</div>
            </div>
          </div>

          <div class="completion-info">
            <div class="floor-badge">第${record.floor_level}层</div>
            <div class="time">${timeFormatted}</div>
          </div>
        </div>

        ${record.egoUsed && record.egoUsed.length > 0 ? `
          <div class="ego-tags">
            ${record.egoUsed.slice(0, 3).map(ego => 
              `<span class="ego-tag">${this.escapeHtml(ego)}</span>`
            ).join('')}
            ${record.egoUsed.length > 3 ? `<span class="ego-tag">+${record.egoUsed.length - 3}</span>` : ''}
          </div>
        ` : ''}

        ${record.comment ? `
          <div class="comment-preview">
            <span class="comment-icon">💬</span>
            ${this.escapeHtml(record.comment.substring(0, 100))}${record.comment.length > 100 ? '...' : ''}
          </div>
        ` : ''}

        <div class="ranking-footer">
          <div class="interactions">
            <!-- [Phase 2: 社交互动] -->
            <button class="ranking-like-btn" title="点赞">
              <span class="like-count">${record.likeCount || 0}</span> ❤️
            </button>
            <button class="ranking-comment-btn" title="评论">
              <span class="comment-count">${record.commentCount || 0}</span> 💬
            </button>
          </div>
          
          <!-- [Phase 2: 用户认证] 删除按钮仅对记录所有者显示 -->
          <button class="ranking-delete-btn" style="display:none;" title="删除">
            🗑️ 删除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 处理筛选按钮点击 [Phase 1: MVP]
   * @private
   */
  handleFilterClick(e) {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    
    const filterType = btn.dataset.filterType;
    const filterValue = btn.dataset.filterValue;

    if (filterType === 'sinner') {
      // 如果点击"全部"或当前已选中的，则设为 null（显示全部）
      this.filters.sinner = (filterValue === 'all' || this.filters.sinner === filterValue) ? null : filterValue;
    } else if (filterType === 'floor') {
      // 如果点击"全部"或当前已选中的，则设为 null（显示全部）
      this.filters.floorLevel = (filterValue === 'all' || this.filters.floorLevel == filterValue) ? null : filterValue;
    }

    // 更新按钮样式
    document.querySelectorAll(`[data-filter-type="${filterType}"]`).forEach(b => {
      b.classList.remove('active');
    });
    
    // 如果没有筛选条件，激活"全部"按钮
    if (filterType === 'sinner' && !this.filters.sinner) {
      const allBtn = document.querySelector(`[data-filter-type="sinner"][data-filter-value="all"]`);
      if (allBtn) allBtn.classList.add('active');
    } else if (filterType === 'floor' && !this.filters.floorLevel) {
      const allBtn = document.querySelector(`[data-filter-type="floor"][data-filter-value="all"]`);
      if (allBtn) allBtn.classList.add('active');
    } else {
      btn.classList.add('active');
    }

    this.currentPage = 1;
    this.loadRankings();
  }

  /**
   * 渲染分页器 [Phase 1: MVP]
   * @private
   */
  renderPagination() {
    if (!this.dom.pagination) return;

    const totalPages = Math.ceil(this.total / this.pageSize);
    if (totalPages <= 1) {
      this.dom.pagination.innerHTML = '';
      return;
    }

    const pageNumbers = [];
    const maxVisible = 5;

    // 计算显示的页码范围
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // 上一页
    pageNumbers.push(`
      <button class="pagination-btn" data-page="${Math.max(1, this.currentPage - 1)}" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        &laquo; 上一页
      </button>
    `);

    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(`
        <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                data-page="${i}">
          ${i}
        </button>
      `);
    }

    // 下一页
    pageNumbers.push(`
      <button class="pagination-btn" data-page="${Math.min(totalPages, this.currentPage + 1)}" 
              ${this.currentPage === totalPages ? 'disabled' : ''}>
        下一页 &raquo;
      </button>
    `);

    this.dom.pagination.innerHTML = pageNumbers.join('');
  }

  /**
   * ==================== Phase 2: 用户认证和社交 ====================
   */

  /**
   * 处理删除排行榜 [Phase 2: 用户认证]
   * @private
   */
  async handleDeleteRanking(e) {
    const recordId = e.target.closest('.ranking-card').dataset.recordId;
    
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      await cloudbaseAPI.deleteRanking(recordId);
      this.loadRankings();
    } catch (error) {
      logger.error('[GlobalRankingController] 删除失败:', error);
      this.showError('删除失败，请稍后重试');
    }
  }

  /**
   * 处理点赞 [Phase 2: 社交互动]
   * @private
   */
  async handleLikeRanking(e) {
    const recordId = e.target.closest('.ranking-card').dataset.recordId;
    
    try {
      await cloudbaseAPI.likeRanking(recordId);
      this.loadRankings(); // 重新加载以更新数据
      logger.info('[GlobalRankingController] 点赞成功');
    } catch (error) {
      logger.warn('[GlobalRankingController] 点赞功能未实现 [Phase 2]');
    }
  }

  /**
   * 处理查看评论 [Phase 2: 社交互动]
   * @private
   */
  async handleViewComments(e) {
    const recordId = e.target.closest('.ranking-card').dataset.recordId;
    logger.warn('[GlobalRankingController] 评论功能未实现 [Phase 2]');
    // TODO: 打开评论模态框
  }

  /**
   * ==================== Phase 3: 实时更新 ====================
   */

  /**
   * 启用实时更新 [Phase 3: 实时推送]
   */
  startWatchingUpdates(interval = 30000) {
    if (this.isWatchingUpdates) return;

    this.isWatchingUpdates = true;
    this.refreshInterval = setInterval(() => {
      this.loadRankings();
      logger.debug('[GlobalRankingController] 定期刷新排行榜');
    }, interval);

    logger.info('[GlobalRankingController] 启用实时更新，刷新间隔:', interval);
  }

  /**
   * 停止实时更新
   */
  stopWatchingUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isWatchingUpdates = false;
    logger.info('[GlobalRankingController] 停止实时更新');
  }

  /**
   * ==================== 工具方法 ====================
   */

  /**
   * 格式化时间
   * @private
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * HTML转义
   * @private
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * 显示加载状态
   * @private
   */
  showLoading(show) {
    if (this.dom.loading) {
      this.dom.loading.style.display = show ? 'block' : 'none';
    }    // 加载结束时恢复列表显示
    if (!show && this.dom.list) {
      this.dom.list.style.display = 'block';
    }  }

  /**
   * 显示错误信息
   * @private
   */
  showError(message) {
    // 隐藏其他状态
    if (this.dom.list) this.dom.list.style.display = 'none';
    if (this.dom.pagination) this.dom.pagination.style.display = 'none';
    if (this.dom.empty) this.dom.empty.style.display = 'none';
    
    // 显示错误状态
    if (this.dom.error) {
      this.dom.error.style.display = 'block';
      const errorText = this.dom.error.querySelector('p');
      if (errorText && message) {
        errorText.textContent = message;
      }
    }
  }

  /**
   * 设置筛选条件
   */
  setFilters(filters) {
    Object.assign(this.filters, filters);
    this.currentPage = 1;
  }

  /**
   * 获取当前筛选条件
   */
  getFilters() {
    return { ...this.filters };
  }
}

// 导出单例
export const globalRankingController = new GlobalRankingController();
