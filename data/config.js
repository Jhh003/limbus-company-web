// 应用配置常量
export const Config = {
    // 项目配置
    itemHeight: 64, // 每个项目高度
    minVisibleRows: 3, // 最小可见行数
    maxVisibleRows: 5, // 最大可见行数
    
    // 滚动配置
    scrollSpeed: 150, // 滚动速度
    scrollInterval: 10, // 滚动间隔时间(ms)
    transitionDuration: '0.05s', // 滚动过渡时长
    transitionType: 'linear', // 滚动过渡类型
    totalHeightMultiplier: 5, // 总高度乘数(用于循环滚动)
    
    // 界面配置
    defaultPage: 'main', // 默认页面
    
    // 动画配置
    highlightAnimationDuration: '0.3s', // 高亮动画时长
    
    // 数据配置
    defaultFilterAll: true, // 默认是否全选
    
    // 消息配置
    errorMessages: {
        noPersonasSelected: '请至少选择一个人格！'
    }
};
