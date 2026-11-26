// 路径和组内顺序对应后台菜单，标题默认读取当前账号的路由。
export const navGroups = [
  {
    id: 'reports', title: '首页与经营报表', icon: 'dashboard',
    paths: [
      '/index',
      '/kangaroo/dashboard',
      '/kangaroo/operations-reports',
      '/kgmanage/weeklyreport',
      '/kgmanage/dailyentry',
    ]
  },
  {
    id: 'jobs', title: '岗位与招聘', icon: 'job',
    paths: [
      '/kangaroo/job',
      '/kangaroo/application',
      '/kgstaffext/volunteerreview',
      '/kangaroo/slot',
      '/kgusersvc/contractsign',
      '/kgusersvc/arrival',
      '/kangaroo/jobopt',
      '/kgstaffext/talentinvite',
      '/kgstaffext/resumeforward',
      '/kgusersvc/jobsub',
      '/kgstaff/jobshare',
    ]
  },
  {
    id: 'online', title: '线上任务', icon: 'clipboard',
    paths: [
      '/kgstaffext/onlinetask',
      '/kgstaffext/onlinereview',
      '/kgstaffext/onlinesubmit',
      '/kgstaffext/onlinesettle',
    ]
  },
  {
    id: 'stores', title: '门店与商家', icon: 'shopping',
    paths: [
      '/kangaroo/store',
      '/kangaroo/merchantapply',
      '/kangaroo/merchantrequest',
      '/kgmanage/task',
      '/kgmanage/taskassignee',
    ]
  },
  {
    id: 'stays', title: '旅居住宿', icon: 'international',
    paths: [
      '/kgstays/stay',
      '/kgstays/roomtype',
      '/kgstays/staycal',
      '/kgstays/staypromo',
      '/kgstays/stayorder',
      '/kgstays/shopservice',
      '/kgstays/shoporder',
      '/kgstays/stayqual',
      '/kgstays/stayvlog',
      '/kgstays/staydiary',
      '/kgstays/staycomment',
    ]
  },
  {
    id: 'community', title: '社区与活动', icon: 'wechat',
    paths: [
      '/kgcommunity/post',
      '/kgcommunity/postcomment',
      '/kgcommunity/activity',
      '/kgcommunity/actsignup',
      '/kgcommunity/tripplan',
      '/kgcommunity/chatconv',
      '/kgusersvc/city',
      '/kangaroo/wishes',
      '/kangaroo/undercover',
      '/kgusersvc/guideapply',
    ]
  },
  {
    id: 'members', title: '用户与会员', icon: 'user',
    paths: [
      '/kangaroo/appuser',
      '/kangaroo/memberlevel',
      '/kangaroo/memberbenefit',
      '/kangaroo/point-mall',
      '/kgusersvc/cert',
      '/kgusersvc/accountdel',
    ]
  },
  {
    id: 'finance', title: '财务与保险', icon: 'money',
    paths: [
      '/kgtrade/payorder',
      '/kgmanage/withdraw',
      '/kangaroo/business-settlement',
      '/kangaroo/merchantFinance',
      '/kgstays/reimburse',
      '/kangaroo/publication-fees',
      '/kgmanage/commission',
      '/kgmanage/walletentry',
      '/kgmanage/payee',
      '/kgstaff/insplan',
      '/kgstaff/insapply',
    ]
  },
  {
    id: 'support', title: '客服与审核', icon: 'question',
    paths: [
      '/kgusersvc/ticket',
      '/kgusersvc/supportchat',
      '/kgusersvc/faq',
      '/kgtrade/report',
      '/kgtrade/review',
      '/kgcommunity/sensword',
      '/kangaroo/governance',
      '/kgmanage/appeal',
    ]
  },
  {
    id: 'staff', title: '员工与主理人', icon: 'peoples',
    paths: [
      '/kangaroo/grant',
      '/kangaroo/stafftask',
      '/kgmanage/honordef',
      '/kgmanage/honoraward',
      '/kgmanage/milestone',
      '/kgmanage/giftoption',
      '/kgmanage/giftclaim',
      '/kgstaff/dispatch',
      '/kgstaff/staffop',
      '/kangaroo/roleswitch',
    ]
  },
  {
    id: 'content', title: '小程序内容与通知', icon: 'message',
    paths: [
      '/kangaroo/homepick',
      '/kgusersvc/appnotice',
      '/kangaroo/message',
      '/kgusersvc/substpl',
      '/kgusersvc/sublog',
      '/kangaroo/deliveries',
    ]
  },
  {
    id: 'system', title: '后台账号与系统管理', icon: 'system',
    paths: [
      '/system/user',
      '/system/role',
      '/system/menu',
      '/system/dept',
      '/system/post',
      '/system/dict',
      '/system/config',
      '/system/notice',
      '/system/log/operlog',
      '/system/log/logininfor',
      '/monitor/online',
      '/monitor/server',
      '/monitor/cache',
      '/monitor/cacheList',
      '/monitor/druid',
    ]
  },
  {
    id: 'other', title: '其他', icon: 'list',
    paths: []
  },
]

export const labels = {
  '/index': '首页·小程序功能开关',
  '/kgstaffext/onlinereview': '线上任务审核（报名）',
  '/kgstaffext/onlinesettle': '线下结算（线上任务）',
  '/kgusersvc/city': '城市字典（城市群码）',
  '/system/post': '岗位管理（系统职务）',
  '/system/notice': '通知公告（后台内部）'
}

export const keywords = {
  '/index': ['开关', '关闭功能', '隐藏功能'],
  '/kangaroo/job': ['发布岗位', '招聘', '义工'],
  '/kgstaffext/volunteerreview': ['义工', '换宿'],
  '/kgstays/stay': ['房子', '民宿', '小院'],
  '/kgstays/staycal': ['房价', '日历', '改价'],
  '/kgstays/stayorder': ['退款', '退钱', '退费', '退房'],
  '/kgstays/shoporder': ['退款', '退钱', '退费'],
  '/kgcommunity/actsignup': ['退款', '退钱', '退费', '活动名单'],
  '/kgtrade/payorder': ['退款', '退钱', '退费'],
  '/kgmanage/withdraw': ['打款', '打钱', '转钱', '提现'],
  '/kgstaff/insapply': ['保险', '投保', '保单', '保险退费', '退款'],
  '/kgstays/reimburse': ['报销', '打款', '小票'],
  '/kangaroo/business-settlement': ['分账', '工资', '服务费', '打款'],
  '/kangaroo/merchantFinance': ['分成', '对账', '打款'],
  '/kgmanage/commission': ['佣金', '分佣'],
  '/kgstays/roomtype': ['库存', '房价'],
  '/kgstays/staypromo': ['特价', '优惠'],
  '/kangaroo/store': ['合作店', '门店资料', '采访视频', '认证'],
  '/kangaroo/merchantapply': ['入驻', '开店'],
  '/kangaroo/merchantrequest': ['派单'],
  '/kangaroo/application': ['录用', '入职', '审核报名'],
  '/kangaroo/slot': ['面试'],
  '/kangaroo/stafftask': ['派任务', '派发'],
  '/kangaroo/homepick': ['首页推荐', '推荐', '横幅'],
  '/kangaroo/memberlevel': ['会员', '等级'],
  '/kangaroo/point-mall': ['积分', '兑换'],
  '/kgusersvc/ticket': ['客服', '投诉'],
  '/kangaroo/governance': ['纠纷', '投诉', '申诉'],
  '/kgcommunity/sensword': ['违禁词', '屏蔽词'],
  '/system/user': ['开账号', '加人', '权限'],
  '/system/role': ['权限', '分配角色'],
  '/kangaroo/grant': ['权限', '开员工权限', '授权'],
  '/kgusersvc/appnotice': ['弹窗', '发公告', '通知'],
  '/kgusersvc/city': ['群码', '地区群码', '二维码'],
  '/kangaroo/operations-reports': ['日报', '月报', '催报']
}
