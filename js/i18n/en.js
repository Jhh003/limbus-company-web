/**
 * English Language Pack
 */

const i18nEN = {
    // Navigation
    pageTitle: 'Global Rankings',
    pageSubtitle: 'Limbus Company · Solo Clear Speedrun',
    version: 'VER',
    help: 'Help',
    backHome: 'Home',
    
    // Buttons
    submitRecord: 'Submit My Record',
    myRecords: 'My Records',
    
    // Filters
    filterSinner: 'Sinner Filter',
    filterFloor: 'Floor Filter',
    all: 'All',
    allFloors: 'All Floors',
    sortBy: 'Sort By',
    sortTime: 'Fastest Time',
    sortDate: 'Newest First',
    resetFilter: 'Reset Filters',
    showing: 'Showing',
    records: 'records',
    
    // Floors
    floor1: 'F1',
    floor2: 'F2',
    floor3: 'F3',
    floor4: 'F4',
    floor5N: 'F5-N',
    floor5H: 'F5-H',
    floor6: 'F6',
    floor7: 'F7',
    floor8: 'F8',
    floor9: 'F9',
    floor10: 'F10',
    floor11: 'F11',
    floor12: 'F12',
    floor13: 'F13',
    floor14: 'F14',
    floor15: 'F15',
    
    // Status
    loading: 'Loading Rankings...',
    noRecords: 'No matching records found',
    beFirst: 'Be the first to submit a record!',
    loadError: 'Failed to load rankings, please try again later',
    loadMore: 'Load More',
    
    // Submit Form
    submitModalTitle: 'Submit Clear Record',
    labelUsername: 'Username',
    labelSinner: 'Sinner',
    labelPersona: 'Identity',
    labelTime: 'Clear Time (seconds)',
    labelFloor: 'Floor',
    labelEgo: 'EGO Gifts Setup',
    labelScreenshot: 'Screenshot URL',
    labelVideo: 'Video URL',
    labelNotes: 'Notes',
    selectSinner: 'Select Sinner',
    selectPersona: 'Select Identity',
    selectPersonaHint: 'Select Sinner first',
    selectFloor: 'Select Floor',
    hintReview: 'Admin review required',
    btnCancel: 'Cancel',
    btnSubmit: 'Submit',
    
    // Placeholders
    phUsername: 'Enter your game ID or nickname',
    phTime: 'e.g. 480',
    phEgo: 'e.g. Fluid Sac (optional)',
    phScreenshot: 'https://... (optional)',
    phVideo: 'https://... (optional)',
    phNotes: 'Clear strategy, setup details, etc. (optional)',
    
    // My Records
    myRecordsTitle: 'My Submissions',
    queryUsername: 'Enter your username',
    queryPlaceholder: 'Username used when submitting',
    queryBtn: 'Search Records',
    totalLabel: 'Total',
    pendingLabel: 'Pending',
    approvedLabel: 'Approved',
    rejectedLabel: 'Rejected',
    noRecordsFound: 'No records found',
    submitTime: 'Submitted',
    
    // Footer
    updateInfo: 'Auto-updates every 30 minutes',
    seasonInfo: 'Season 7 · Records require admin approval',
    fanWork: 'Fan-made project, not affiliated with Project Moon',
    dataSource: 'Data contributed by players',
    
    // Help Modal
    helpTitle: '📜 How to Use Rankings',
    helpView: '👁️ View Rankings',
    helpViewTip1: 'Use left panel to filter by <strong>Sinner</strong> or <strong>Floor</strong>',
    helpViewTip2: 'Sort by clear time (fastest) or submission time (newest)',
    helpViewTip3: 'Click cards for details and EGO gift setups',
    helpSubmit: '🔑 Submit Record',
    helpSubmitTip1: 'Click <strong>"Submit My Record"</strong> button',
    helpSubmitTip2: 'Required: Username, Sinner, Identity, Time, Floor',
    helpSubmitTip3: 'Optional: EGO Gifts, Screenshot, Video, Notes',
    helpSubmitTip4: 'Records require approval before appearing',
    helpMyRecord: '📋 My Records',
    helpRecordTip1: 'Click <strong>"My Records"</strong> button',
    helpRecordTip2: 'Enter the username used when submitting',
    helpRecordTip3: 'Check status: Pending / Approved / Rejected',
    helpTips: '⭐ Tips',
    helpTip1: 'Time is in seconds; homepage timer can auto-fill',
    helpTip2: 'Ensure accurate info; false data may result in ban',
    helpTip3: 'Floor 5 has Normal and Hard modes',
    
    // Status Labels
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    
    // Toast Messages
    submitting: 'Submitting...',
    submitSuccess: 'Success! Your record will appear after approval.',
    submitError: 'Submit failed: ',
    enterUsername: 'Please enter username',
    searching: 'Searching...',
    searchError: 'Search failed: '
};

// 罪人英文名称映射（英文环境）
const sinnerNamesEN = {
    'Yi Sang': 'Yi Sang',
    'Faust': 'Faust',
    'Don Quixote': 'Don Quixote',
    'Ryoshu': 'Ryoshu',
    'Meursault': 'Meursault',
    'Hong Lu': 'Hong Lu',
    'Heathcliff': 'Heathcliff',
    'Ishmael': 'Ishmael',
    'Rodion': 'Rodion',
    'Sinclair': 'Sinclair',
    'Outis': 'Outis',
    'Gregor': 'Gregor'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18nEN, sinnerNamesEN };
}
