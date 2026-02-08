/**
 * 简体中文语言包
 */

const i18nZH = {
    // 导航
    pageTitle: '全球排行榜',
    pageSubtitle: 'Limbus Company · 单通竞速',
    version: '版本',
    help: '使用说明',
    backHome: '返回主页',
    
    // 按钮
    submitRecord: '提交我的通关记录',
    myRecords: '查看我的记录',
    
    // 筛选
    filterSinner: '罪人筛选',
    filterFloor: '楼层筛选',
    all: '全部',
    allFloors: '全部楼层',
    sortBy: '排序方式',
    sortTime: '按速度 (最快)',
    sortDate: '按时间 (最新)',
    resetFilter: '重置筛选',
    showing: '显示',
    records: '条记录',
    
    // 楼层
    floor1: '第1层',
    floor2: '第2层',
    floor3: '第3层',
    floor4: '第4层',
    floor5N: '第5层(普)',
    floor5H: '第5层(困)',
    floor6: '第6层',
    floor7: '第7层',
    floor8: '第8层',
    floor9: '第9层',
    floor10: '第10层',
    floor11: '第11层',
    floor12: '第12层',
    floor13: '第13层',
    floor14: '第14层',
    floor15: '第15层',
    
    // 状态
    loading: '正在加载排行榜...',
    noRecords: '暂无符合条件的记录',
    beFirst: '成为第一个提交记录的人吧！',
    loadError: '加载排行榜失败，请稍后重试',
    loadMore: '加载更多',
    
    // 提交表单
    submitModalTitle: '提交通关记录',
    labelUsername: '用户名',
    labelSinner: '罪人',
    labelPersona: '人格',
    labelTime: '通关时间（秒）',
    labelFloor: '通关楼层',
    labelEgo: 'EGO饰品配置',
    labelScreenshot: '截图链接',
    labelVideo: '视频链接',
    labelNotes: '备注说明',
    selectSinner: '请选择罪人',
    selectPersona: '请选择人格',
    selectPersonaHint: '请先选择罪人',
    selectFloor: '请选择楼层',
    hintReview: '管理员将进行人工审核',
    btnCancel: '取消',
    btnSubmit: '提交记录',
    
    // Placeholders
    phUsername: '请输入您的游戏ID或昵称',
    phTime: '例：480',
    phEgo: '例：液袋（可选）',
    phScreenshot: 'https://...（可选）',
    phVideo: 'https://...（可选）',
    phNotes: '通关心得、配置说明等（可选）',
    
    // 我的记录
    myRecordsTitle: '我的提交记录',
    queryUsername: '请输入您的用户名',
    queryPlaceholder: '输入提交记录时使用的用户名',
    queryBtn: '查询记录',
    totalLabel: '总记录数',
    pendingLabel: '待审核',
    approvedLabel: '已通过',
    rejectedLabel: '已拒绝',
    noRecordsFound: '未找到相关记录',
    submitTime: '提交时间',
    
    // 页脚
    updateInfo: '数据每30分钟自动更新',
    seasonInfo: '第七赛季 · 提交的记录需管理员审核后显示',
    fanWork: '本项目为粉丝作品，与 Project Moon 官方无关',
    dataSource: '数据来源于玩家贡献',
    
    // 帮助弹窗
    helpTitle: '📜 如何使用排行榜',
    helpView: '👁️ 查看排行榜',
    helpViewTip1: '使用左侧筛选面板按<strong>罪人</strong>或<strong>楼层</strong>筛选记录',
    helpViewTip2: '支持按通关速度（最快）或提交时间（最新）排序',
    helpViewTip3: '点击卡片可查看详细信息和EGO饰品配置',
    helpSubmit: '🔑 提交通关记录',
    helpSubmitTip1: '点击顶部<strong>"提交我的通关记录"</strong>按钮',
    helpSubmitTip2: '填写必填信息：用户名、罪人、人格、通关时间、楼层',
    helpSubmitTip3: '可选填写：EGO饰品、截图链接、视频链接、备注',
    helpSubmitTip4: '提交后需等待管理员审核，通过后显示在排行榜',
    helpMyRecord: '📋 查看我的记录',
    helpRecordTip1: '点击<strong>"查看我的记录"</strong>按钮',
    helpRecordTip2: '输入提交时使用的用户名即可查询',
    helpRecordTip3: '可查看所有提交记录的审核状态（待审核/已通过/已拒绝）',
    helpTips: '⭐ 小贴士',
    helpTip1: '通关时间以秒为单位计算，主页计时器可自动跳转填充',
    helpTip2: '请确保提交的信息真实准确，虚假信息可能被封禁',
    helpTip3: '第5层区分普牢和困牢两个模式',
    
    // 状态标签
    statusPending: '待审核',
    statusApproved: '已通过',
    statusRejected: '已拒绝',
    
    // 提示消息
    submitting: '正在提交...',
    submitSuccess: '提交成功！您的记录将在审核通过后显示在排行榜中。',
    submitError: '提交失败：',
    enterUsername: '请输入用户名',
    searching: '查询中...',
    searchError: '查询失败：'
};

// 罪人英文到中文映射
const sinnerNamesZH = {
    'Yi Sang': '李箱',
    'Faust': '浮士德',
    'Don Quixote': '唐吉诃德',
    'Ryoshu': '良秀',
    'Meursault': '默尔索',
    'Hong Lu': '鸿璐',
    'Heathcliff': '希斯克利夫',
    'Ishmael': '以实玛利',
    'Rodion': '罗佳',
    'Sinclair': '辛克莱',
    'Outis': '奥提斯',
    'Gregor': '格里高尔'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18nZH, sinnerNamesZH };
}
