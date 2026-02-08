/**
 * 腾讯云CloudBase API SDK
 * 
 * 设计原则：
 * - MVP阶段只实现排行榜基础功能
 * - 预留所有第二/三阶段的接口
 * - 方法命名清晰，易于扩展
 * 
 * Phase标记：
 * [Phase 1] MVP必需功能
 * [Phase 2] 用户认证和社交
 * [Phase 3] 数据分析
 */

import { logger } from '../core/logger.js';

export class CloudbaseAPI {
  constructor(config = {}) {
    // 使用相对路径，避免混合内容问题（HTTPS页面请求HTTP API）
    this.config = {
      env: config.env || 'self-hosted',
      apiBaseUrl: config.apiBaseUrl || '/api'  // 统一使用相对路径，通过Nginx反向代理
    };
    
    this.token = null;
    this.currentUser = null;
    
    logger.info('[CloudbaseAPI] 初始化完成，API地址:', this.config.apiBaseUrl);
  }

  /**
   * ==================== Phase 1: MVP 排行榜功能 ====================
   */

  /**
   * 提交排行榜记录 [Phase 1: MVP]
   * @param {Object} data - 排行榜数据
   * @returns {Promise<Object>} 提交结果
   */
  async submitRanking(data) {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/rankings/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      // 检查响应成功状态（支持 success 和 code 两种格式）
      const isSuccess = result.success === true || result.code === 200;
      if (!isSuccess) {
        throw new Error(result.message || '提交失败');
      }

      logger.info('[CloudbaseAPI] 排行榜记录提交成功', result.data);
      return result.data;
    } catch (error) {
      logger.error('[CloudbaseAPI] 提交排行榜失败:', error);
      throw error;
    }
  }

  /**
   * 获取排行榜列表 [Phase 1: MVP]
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 排行榜记录
   */
  async getRankingList(options = {}) {
    try {
      const params = new URLSearchParams({
        page: options.page || 1,
        limit: options.limit || 20,
        sortBy: options.sortBy || 'time',
        status: options.status || 'verified',
        ...(options.sinner && { sinner: options.sinner }),
        ...(options.floorLevel && { floorLevel: options.floorLevel })
      });

      const response = await fetch(
        `${this.config.apiBaseUrl}/rankings/list?${params}`,
        {
          headers: {
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
          }
        }
      );

      const result = await response.json();

      // 检查响应成功状态（支持 success 和 code 两种格式）
      const isSuccess = result.success === true || result.code === 200;
      if (!isSuccess) {
        throw new Error(result.message || '请求失败');
      }

      return result.data;
    } catch (error) {
      logger.error('[CloudbaseAPI] 获取排行榜失败:', error);
      throw error;
    }
  }

  /**
   * 获取排行榜单条记录 [Phase 1: MVP]
   * @param {string} recordId - 记录ID
   * @returns {Promise<Object>} 记录详情
   */
  async getRankingDetail(recordId) {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/rankings/${recordId}`,
        {
          headers: {
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
          }
        }
      );

      const result = await response.json();

      // 检查响应成功状态（支持 success 和 code 两种格式）
      const isSuccess = result.success === true || result.code === 200;
      if (!isSuccess) {
        throw new Error(result.message || '请求失败');
      }

      return result.data;
    } catch (error) {
      logger.error('[CloudbaseAPI] 获取排行榜详情失败:', error);
      throw error;
    }
  }

  /**
   * 删除排行榜记录 [Phase 1: MVP]
   * @param {string} recordId - 记录ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteRanking(recordId) {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/rankings/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
          }
        }
      );

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(result.message);
      }

      logger.info('[CloudbaseAPI] 排行榜记录删除成功');
      return true;
    } catch (error) {
      logger.error('[CloudbaseAPI] 删除排行榜失败:', error);
      throw error;
    }
  }

  /**
   * ==================== Phase 2: 用户认证功能 ====================
   */

  /**
   * 用户注册 [Phase 2: 用户认证]
   * @param {Object} data - 注册数据 {username, password, email?}
   * @returns {Promise<Object>} {userId, token}
   */
  async registerUser(data) {
    // Phase 2实现
    // POST /api/users/register
    logger.warn('[CloudbaseAPI] registerUser 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 用户登录 [Phase 2: 用户认证]
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} {userId, token, user}
   */
  async loginUser(username, password) {
    // Phase 2实现
    // POST /api/users/login
    logger.warn('[CloudbaseAPI] loginUser 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 用户登出 [Phase 2: 用户认证]
   */
  logout() {
    this.token = null;
    this.currentUser = null;
    logger.info('[CloudbaseAPI] 用户已登出');
  }

  /**
   * 设置认证Token [Phase 2: 用户认证]
   * @param {string} token - JWT Token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * 获取当前用户 [Phase 2: 用户认证]
   * @returns {Object} 当前用户信息
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 获取用户信息 [Phase 2: 用户认证]
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  async getUserProfile(userId) {
    // Phase 2实现
    // GET /api/users/:userId/profile
    logger.warn('[CloudbaseAPI] getUserProfile 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 更新用户信息 [Phase 2: 用户认证]
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserProfile(data) {
    // Phase 2实现
    // PATCH /api/users/profile
    logger.warn('[CloudbaseAPI] updateUserProfile 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 获取用户的所有排行榜记录 [Phase 2: 用户认证]
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 用户记录
   */
  async getUserRecords(userId) {
    // Phase 2实现
    // GET /api/users/:userId/records
    logger.warn('[CloudbaseAPI] getUserRecords 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * ==================== Phase 2: 社交互动功能 ====================
   */

  /**
   * 点赞排行榜记录 [Phase 2: 社交互动]
   * @param {string} recordId - 记录ID
   * @returns {Promise<Object>} {likeCount}
   */
  async likeRanking(recordId) {
    // Phase 2实现
    // POST /api/rankings/:recordId/like
    logger.warn('[CloudbaseAPI] likeRanking 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 取消点赞 [Phase 2: 社交互动]
   * @param {string} recordId - 记录ID
   * @returns {Promise<boolean>} 是否成功
   */
  async unlikeRanking(recordId) {
    // Phase 2实现
    // DELETE /api/rankings/:recordId/like
    logger.warn('[CloudbaseAPI] unlikeRanking 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 发表评论 [Phase 2: 社交互动]
   * @param {string} recordId - 记录ID
   * @param {string} content - 评论内容
   * @returns {Promise<Object>} 评论对象
   */
  async addComment(recordId, content) {
    // Phase 2实现
    // POST /api/rankings/:recordId/comments
    logger.warn('[CloudbaseAPI] addComment 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 获取评论列表 [Phase 2: 社交互动]
   * @param {string} recordId - 记录ID
   * @param {number} page - 页码
   * @returns {Promise<Array>} 评论列表
   */
  async getComments(recordId, page = 1) {
    // Phase 2实现
    // GET /api/rankings/:recordId/comments
    logger.warn('[CloudbaseAPI] getComments 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * 关注用户 [Phase 2: 社交互动]
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async followUser(userId) {
    // Phase 2实现
    // POST /api/users/:userId/follow
    logger.warn('[CloudbaseAPI] followUser 功能未实现 [Phase 2]');
    return null;
  }

  /**
   * ==================== Phase 3: 数据分析功能 ====================
   */

  /**
   * 获取罪人统计 [Phase 3: 数据分析]
   * @param {number} sinnerId - 罪人ID
   * @returns {Promise<Object>} 统计数据
   */
  async getSinnerStats(sinnerId) {
    // Phase 3实现
    // GET /api/stats/sinner/:sinnerId
    logger.warn('[CloudbaseAPI] getSinnerStats 功能未实现 [Phase 3]');
    return null;
  }

  /**
   * 获取日期统计 [Phase 3: 数据分析]
   * @param {string} date - 日期
   * @returns {Promise<Object>} 统计数据
   */
  async getDailyStats(date) {
    // Phase 3实现
    // GET /api/stats/daily/:date
    logger.warn('[CloudbaseAPI] getDailyStats 功能未实现 [Phase 3]');
    return null;
  }

  /**
   * 获取热点排行 [Phase 3: 数据分析]
   * @returns {Promise<Object>} 热点数据
   */
  async getTrendingStats() {
    // Phase 3实现
    // GET /api/stats/trending
    logger.warn('[CloudbaseAPI] getTrendingStats 功能未实现 [Phase 3]');
    return null;
  }

  /**
   * 获取热度排行 [Phase 3: 数据分析]
   * @returns {Promise<Array>} 热点排行
   */
  async getPopularityRanking() {
    // Phase 3实现
    logger.warn('[CloudbaseAPI] getPopularityRanking 功能未实现 [Phase 3]');
    return null;
  }

  /**
   * ==================== 工具方法 ====================
   */

  /**
   * 设置API基础URL
   * @param {string} url - 基础URL
   */
  setApiBaseUrl(url) {
    this.config.apiBaseUrl = url;
  }

  /**
   * 创建查询参数
   * @private
   */
  createQueryParams(obj) {
    return new URLSearchParams(
      Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
      )
    );
  }
}

// 导出单例（不传 apiBaseUrl，让构造函数自动判断环境）
export const cloudbaseAPI = new CloudbaseAPI();
