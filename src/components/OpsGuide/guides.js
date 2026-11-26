// 操作向导流程数据（纯数据模块，不依赖 Vue 或 @/ 别名，供页面与 node --test 共用）
// 文案面向不懂技术的运营人员：白话短句，按钮名、标签页名、字段名均对照页面与后端代码核对。

export const GUIDE_GROUPS = [
  { id: 'reports', title: '首页与经营报表' },
  { id: 'jobs', title: '岗位与招聘' },
  { id: 'online', title: '线上任务' },
  { id: 'stores', title: '门店与商家' },
  { id: 'stays', title: '旅居住宿' },
  { id: 'community', title: '社区与活动' },
  { id: 'members', title: '用户与会员' },
  { id: 'finance', title: '财务与保险' },
  { id: 'support', title: '客服与审核' },
  { id: 'staff', title: '员工与主理人' },
  { id: 'content', title: '小程序内容与通知' }
]

export const QUICK_QUERIES = [
  '发布岗位',
  '上架房源',
  '开员工权限',
  '处理退款',
  '换地区群码',
  '发日报催报'
]

export const GUIDES = [
  {
    id: 'publish-job',
    groupId: 'jobs',
    groupTitle: '岗位与招聘',
    title: '发布一个新岗位（换宿 / 兼职 / 全职）',
    summary: '新建岗位草稿并上架到小程序；线上任务不在这里建，要去「线上任务」页面。',
    keywords: [
      '发布岗位', '新增岗位', '招人', '招聘', '换宿', '换工', '兼职', '全职',
      '上架岗位', '岗位草稿', '岗位照片', '岗位要求选项', '年龄', '性格', '暂停岗位', '关闭岗位'
    ],
    pages: ['/kangaroo/job', '/kangaroo/jobopt'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/job',
        pageName: '岗位管理',
        perm: 'kangaroo:job:add',
        permLabel: '新增岗位',
        text: '打开「岗位管理」，点顶部「新增」；先选「发布管理门店」（门店须为启用状态）和「岗位分类」（线上任务不能在这里选）。'
      },
      {
        where: 'admin',
        path: '/kangaroo/job',
        pageName: '岗位管理',
        perm: 'kangaroo:job:add',
        permLabel: '新增岗位',
        text: '填「岗位标题」「城市」「工作地点」，传「岗位照片」（线下岗位至少 1 张），再填「计薪方式」「招聘名额」「食宿」「工作内容」「年龄」「性格」和「其他要求」，点「确 定」存成草稿。',
        extraLinks: [
          { path: '/kangaroo/jobopt', pageName: '岗位要求选项' }
        ]
      },
      {
        where: 'admin',
        path: '/kangaroo/job',
        pageName: '岗位管理',
        perm: 'kangaroo:job:publish',
        permLabel: '发布岗位',
        text: '在列表找到这条草稿，操作列点「发布」，在「上架前确认采访与门店亮点」弹窗点「保存配置并上架」。后续可点「暂停」「关闭」，门店交上来的草稿可点「不通过」。'
      }
    ]
  },
  {
    id: 'create-store',
    groupId: 'stores',
    groupTitle: '门店与商家',
    title: '新增门店 / 填写门店资料与采访视频',
    summary: '先建好门店基本信息，再补齐采访视频、店长介绍和安心认证。',
    keywords: [
      '新增门店', '添加门店', '门店管理', '门店资料', '采访视频', '安心认证', '撤销认证',
      '实地探访', '线上采访', '营业执照', '店长介绍', '地图定位', '运营类型'
    ],
    pages: ['/kangaroo/store'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/store',
        pageName: '门店管理',
        perm: 'kangaroo:store:add',
        permLabel: '新增门店',
        text: '打开「门店管理」，点顶部「新增」，填「门店名称」「城市」「详细地址」「联系电话」（11 位手机号），选「运营类型」，设「地图定位」，传「门店图片」并填「门店简介」，点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/store',
        pageName: '门店管理',
        perm: 'kangaroo:store:edit',
        permLabel: '修改门店',
        text: '在操作列点「门店资料 / 采访视频」，选「采访方式」（改「实地探访」会联动安心认证），点「选择视频」或「换一个视频」传采访视频，再填「店长介绍」「该店亮点」「交通参考」「营业执照」「店里日常」，点「保 存」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/store',
        pageName: '门店管理',
        perm: 'kangaroo:store:cert',
        permLabel: '门店认证',
        text: '需要单独打标或取消安心认证时，在操作列点「认证」或「撤销认证」。'
      }
    ]
  },
  {
    id: 'application-flow',
    groupId: 'jobs',
    groupTitle: '岗位与招聘',
    title: '处理报名：审核 → 录用 → 入职',
    summary: '后台负责初审、确认录用和标记入职；约面试、签责任书和填到店信息由用户在小程序自己完成。',
    keywords: [
      '处理报名', '报名审核', '审核报名', '换工审核', '确认录用', '标记入职', '结束工作',
      '终止报名', '责任书签署', '到店信息', '报名管理', '义工报名', '换工报名'
    ],
    pages: [
      '/kangaroo/application',
      '/kgstaffext/volunteerreview',
      '/kangaroo/slot',
      '/kgusersvc/contractsign',
      '/kgusersvc/arrival'
    ],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/application',
        pageName: '报名管理',
        perm: 'kangaroo:application:audit',
        permLabel: '审核报名',
        text: '打开「报名管理」（只看换工可进「换工审核」），找到待审核报名，点「详情」看资料，再点「通过」或「驳回」（驳回必填原因）。',
        extraLinks: [
          { path: '/kgstaffext/volunteerreview', pageName: '换工审核' }
        ]
      },
      {
        where: 'admin',
        path: '/kangaroo/slot',
        pageName: '面试时段',
        perm: 'kangaroo:slot:add',
        permLabel: '新增面试时段',
        text: '后台不能替用户约面试：请先在「面试时段」给门店配好可选的面试时间（做法见「设置面试时段」流程）。'
      },
      {
        where: 'miniprogram',
        text: '报名用户在小程序里自己选时段、完成面试并提交「愿意前往」；这一阶段后台只能点「终止」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/application',
        pageName: '报名管理',
        perm: 'kangaroo:application:confirm',
        permLabel: '确认录用与入职',
        text: '用户表态「愿意前往」后，请在 24 小时确认截止前点「确认录用」，系统会占 1 个名额并通知用户签责任书。'
      },
      {
        where: 'miniprogram',
        text: '用户在小程序里签署责任书并填写到店信息；后台只能在「责任书签署」和「到店信息」页面查看，不能代填。'
      },
      {
        where: 'admin',
        path: '/kangaroo/application',
        pageName: '报名管理',
        perm: 'kangaroo:application:confirm',
        permLabel: '确认录用与入职',
        text: '人员实际到岗后，在操作列点「标记入职」。需要查签约或到店记录时可打开下方只读页面。',
        extraLinks: [
          { path: '/kgusersvc/contractsign', pageName: '责任书签署' },
          { path: '/kgusersvc/arrival', pageName: '到店信息' }
        ]
      },
      {
        where: 'admin',
        path: '/kangaroo/application',
        pageName: '报名管理',
        perm: 'kangaroo:application:terminate',
        permLabel: '结束工作',
        text: '工作结束后，在操作列点「结束工作」。'
      }
    ]
  },
  {
    id: 'interview-slots',
    groupId: 'jobs',
    groupTitle: '岗位与招聘',
    title: '设置面试时段',
    summary: '提前配置门店可预约的面试时间，初审通过的报名人就能在小程序里自己挑时段。',
    keywords: [
      '面试时段', '设置面试时段', '面试时间', '预约面试', '约面试', '会议信息', '新增时段', '修改时段'
    ],
    pages: ['/kangaroo/slot'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/slot',
        pageName: '面试时段',
        perm: 'kangaroo:slot:add',
        permLabel: '新增面试时段',
        text: '打开「面试时段」，点顶部「新增」，选「门店」和「限定岗位」（留空就是门店通用时段），填「开始时间」「结束时间」和「会议信息」（只给已预约的人看），点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/slot',
        pageName: '面试时段',
        perm: 'kangaroo:slot:edit',
        permLabel: '修改面试时段',
        text: '要调整时间，在操作列点「修改」；正被进行中报名占用的时段不能改。'
      },
      {
        where: 'admin',
        path: '/kangaroo/slot',
        pageName: '面试时段',
        perm: 'kangaroo:slot:remove',
        permLabel: '删除面试时段',
        text: '不再需要的时段，在操作列点「删除」；正被进行中报名占用的时段不能删。'
      }
    ]
  },
  {
    id: 'online-task',
    groupId: 'online',
    groupTitle: '线上任务',
    title: '线上任务：新建 → 上架 → 审核接单',
    summary: '在后台建草稿、上架并审核接单人；后续的成果验收和线下打款由门店在小程序员工端完成。',
    keywords: [
      '线上任务', '发布线上任务', '新增线上任务', '线上任务审核', '接单审核',
      '成果提交', '线下结算', '继续开启', '远程任务', '佣金'
    ],
    pages: [
      '/kgstaffext/onlinetask',
      '/kangaroo/job',
      '/kgstaffext/onlinereview',
      '/kgstaffext/onlinesubmit',
      '/kgstaffext/onlinesettle',
      '/kangaroo/publication-fees'
    ],
    steps: [
      {
        where: 'admin',
        path: '/kgstaffext/onlinetask',
        pageName: '线上任务',
        perm: 'kangaroo:job:add',
        permLabel: '新增线上任务',
        text: '打开「线上任务」，点「新增线上任务」，选「所属门店」，填「任务标题」「任务类型」「交付物」「验收标准」「预计完成时间」「每单佣金」「名额」，点「保存草稿」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/job',
        pageName: '岗位管理',
        perm: 'kangaroo:job:publish',
        permLabel: '发布岗位',
        text: '去「岗位管理」找到这条草稿，操作列点「发布」上架；如果到期自动关闭了，点「继续开启」。'
      },
      {
        where: 'admin',
        path: '/kgstaffext/onlinereview',
        pageName: '线上任务审核（报名）',
        perm: 'kangaroo:application:audit',
        permLabel: '审核接单',
        text: '有人接单后，打开「线上任务审核（报名）」，操作列点「通过」或「驳回」（线上任务无需面试、签约或保险）。'
      },
      {
        where: 'miniprogram',
        text: '接单人交稿后，成果验收、退回修改、线下付款和登记凭证，都由所属门店在小程序员工端完成。'
      },
      {
        where: 'admin',
        path: '/kgstaffext/onlinesubmit',
        pageName: '成果提交',
        text: '后台「成果提交」和「线下结算（线上任务）」都是只读记录，可以点「详情」查看或点「导出表格」对账。',
        extraLinks: [
          { path: '/kgstaffext/onlinesettle', pageName: '线下结算（线上任务）' }
        ]
      }
    ]
  },
  {
    id: 'publish-stay',
    groupId: 'stays',
    groupTitle: '旅居住宿',
    title: '上架旅居房源：房源 → 房型 → 审核上线 → 房态与早鸟价',
    summary: '先建房源和房型，员工端补齐资质后审核上线，再按需调单日房价和早鸟特价。',
    keywords: [
      '上架房源', '新增房源', '旅居房源', '房源管理', '房型管理', '房态价格', '早鸟特价',
      '房源资质', '审核上线', '展示检查', '改价', '关房', '小院视频', '房价', '住宿上架'
    ],
    pages: [
      '/kgstays/stay',
      '/kgstays/roomtype',
      '/kgstays/stayqual',
      '/kgstays/staycal',
      '/kgstays/staypromo'
    ],
    steps: [
      {
        where: 'admin',
        path: '/kgstays/stay',
        pageName: '房源管理',
        perm: 'kangaroo:stay:add',
        permLabel: '新增房源',
        text: '打开「房源管理」，点「新增」，选「房源类型」「门店ID」，填「房源名称」「城市」「详细地址」「封面」「取消政策」「预订须知」等，点「确 定」（小院视频在列表点「修改」上传）。'
      },
      {
        where: 'admin',
        path: '/kgstays/roomtype',
        pageName: '房型管理',
        perm: 'kangaroo:roomtype:add',
        permLabel: '新增房型',
        text: '在房源行点「管理房型」（或直接进「房型管理」），点「新增」，选「所属房源」，填「房型名称」「房型大类」「可住人数」「库存单位」「默认每晚库存」「7天总价（元）」（可选填「半个月总价（15晚）」「一个月总价（30晚）」），「状态」选「上架」，点「确 定」。'
      },
      {
        where: 'miniprogram',
        text: '房源资质文件（营业执照、消防合格证等）由门店在小程序员工端上传；后台「房源资质」页只能点「查看文件」核验。'
      },
      {
        where: 'admin',
        path: '/kgstays/stay',
        pageName: '房源管理',
        perm: 'kangaroo:stay:query',
        permLabel: '查看房源',
        text: '回「房源管理」，在房源行点「展示检查」，看看还缺哪些资料。',
        extraLinks: [
          { path: '/kgstays/stayqual', pageName: '房源资质' }
        ]
      },
      {
        where: 'admin',
        path: '/kgstays/stay',
        pageName: '房源管理',
        perm: 'kangaroo:stay:edit',
        permLabel: '修改房源',
        text: '资料补齐后，在房源行点「提交审核」。'
      },
      {
        where: 'admin',
        path: '/kgstays/stay',
        pageName: '房源管理',
        perm: 'kangaroo:stay:audit',
        permLabel: '审核房源上线',
        text: '由有审核权限的账号在房源行点「审核上线」（后续可「下架」或「恢复上线」）。'
      },
      {
        where: 'admin',
        path: '/kgstays/staycal',
        pageName: '房态价格',
        perm: 'kangaroo:staycal:edit',
        permLabel: '修改房态价格',
        text: '调单日价格或库存时，在「房态价格」对已有日期行点「修改」，调「当晚价（空=基础价）」「当晚库存（空=默认）」或「关房」；这里不能新增日期行，批量改价或关房请在小程序员工端操作。'
      },
      {
        where: 'admin',
        path: '/kgstays/staypromo',
        pageName: '早鸟特价',
        perm: 'kangaroo:staypromo:add',
        permLabel: '新增早鸟特价',
        text: '（可选）做特价活动时，打开「早鸟特价」点「新增」，填「房源ID」「房型ID」「特价晚价」「可售单数」「适用入住日起」「适用入住日止」「售卖截止」，选「可取消」，「状态」选「启用」，点「确 定」。'
      }
    ]
  },
  {
    id: 'stay-refund',
    groupId: 'stays',
    groupTitle: '旅居住宿',
    title: '处理旅居订单退款（含退房后退款）',
    summary: '订单取消由用户在小程序发起，后台负责审核退款、退房后退款以及增值服务退款。',
    keywords: [
      '处理退款', '客人退款', '旅居退款', '订单退款', '退房后退款', '退款审核', '同意退款',
      '驳回退款', '服务订单退款', '支付单退款', '全额退款', '退款进度', '取消订单', '退房'
    ],
    pages: ['/kgstays/stayorder', '/kgstays/shoporder', '/kgtrade/payorder'],
    steps: [
      {
        where: 'miniprogram',
        text: '取消订单只能由用户在小程序自己发起，后台没有「取消订单」按钮；有待审退款时，首页数据看板顶部会出现「旅居/服务退款待审核」提醒条。'
      },
      {
        where: 'admin',
        path: '/kgstays/stayorder',
        pageName: '旅居订单',
        perm: 'kangaroo:stayorder:refund',
        permLabel: '旅居订单退款',
        text: '打开「旅居订单」，在「旅居订单」标签页筛选待审核退款，操作列点「同意退款」（释放房量并原路退回）或「驳回退款」（必填原因）。'
      },
      {
        where: 'admin',
        path: '/kgstays/stayorder',
        pageName: '旅居订单',
        perm: 'kangaroo:stayorder:refund',
        permLabel: '退房后退款审核',
        text: '如果是退房后申请的退款，在同页切到「退房后退款申请」标签页，筛选「待审核」，点「同意退款」或「驳回」。'
      },
      {
        where: 'admin',
        path: '/kgstays/shoporder',
        pageName: '服务订单',
        perm: 'kangaroo:shoporder:refund',
        permLabel: '服务订单退款',
        text: '增值服务退款在「服务订单」点「同意退款」或「驳回退款」。'
      },
      {
        where: 'admin',
        path: '/kgtrade/payorder',
        pageName: '支付单',
        perm: 'kangaroo:payorder:query',
        permLabel: '查看支付单',
        text: '想知道钱退到哪一步了，去「支付单」找到这笔单，点「退款进度」。'
      },
      {
        where: 'admin',
        path: '/kgtrade/payorder',
        pageName: '支付单',
        perm: 'kangaroo:payorder:refund',
        permLabel: '支付单全额退款',
        text: '特殊情况要直接退钱时，在「支付单」点「全额退款」：会把这笔单还没退的钱一次全部退回，不能只退一部分，点之前请先确认。'
      }
    ]
  },
  {
    id: 'staff-permissions',
    groupId: 'staff',
    groupTitle: '员工与主理人',
    title: '给员工 / 城市负责人开通小程序和后台权限',
    summary: '小程序员工身份在「员工授权」开通；网页后台账号必须同时配好角色和城市授权才能看到业务数据。',
    keywords: [
      '开员工权限', '员工权限', '开通权限', '员工授权', '城市授权', '后台账号', '分配角色',
      '新增用户', '角色管理', '用户管理', '城市负责人', '主理人权限', '撤销授权', '权限'
    ],
    pages: ['/kangaroo/grant', '/system/role', '/system/user'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/grant',
        pageName: '员工授权',
        perm: 'kangaroo:grant:add',
        permLabel: '新增员工授权',
        text: '开小程序员工身份：打开「员工授权」点「新增授权」，搜「小程序账号」（昵称、手机号或账号 ID），选「授权方式」（「门店授权」选门店，或「城市授权（无需门店）」选「负责城市」），选「员工角色」后点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/grant',
        pageName: '员工授权',
        perm: 'kangaroo:grant:edit',
        permLabel: '修改员工角色',
        text: '员工换岗时，在「员工授权」找到这个人，点「修改角色」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/grant',
        pageName: '员工授权',
        perm: 'kangaroo:grant:revoke',
        permLabel: '撤销员工授权',
        text: '员工离职时，在「员工授权」找到这个人，点这一行的「撤销」（多人一起撤可以先勾选，再点上方「撤销授权」）。'
      },
      {
        where: 'admin',
        path: '/system/role',
        pageName: '角色管理',
        perm: 'system:role:add',
        permLabel: '新增角色',
        text: '开网页后台账号第 1 步：如果没有现成角色，先去「角色管理」点「新增」，填「角色名称」「权限字符」，勾选「菜单权限」，点「确 定」。'
      },
      {
        where: 'admin',
        path: '/system/user',
        pageName: '用户管理',
        perm: 'system:user:add',
        permLabel: '新增后台账号',
        text: '开网页后台账号第 2 步：去「用户管理」点「新增」，填「用户昵称」「用户名称」「用户密码」，选好「角色」点「确 定」。'
      },
      {
        where: 'admin',
        path: '/system/user',
        pageName: '用户管理',
        perm: 'system:user:edit',
        permLabel: '修改后台账号',
        text: '已有后台账号要换角色：在「用户管理」操作列点「分配角色」图标（鼠标放上去会显示这几个字），勾好角色后点「提交」。'
      },
      {
        where: 'admin',
        path: '/system/user',
        pageName: '用户管理',
        text: '开网页后台账号第 3 步（必做）：由超级管理员在「用户管理」操作列点「城市授权」，选「指定城市」或「全部城市（平台运营）」后点「保存授权」。不配城市授权，登录后台看不到任何业务数据。'
      }
    ]
  },
  {
    id: 'notice-and-homepick',
    groupId: 'content',
    groupTitle: '小程序内容与通知',
    title: '发小程序公告、改首页推荐内容',
    summary: '发布小程序公告和弹窗提醒、回复用户留言，以及配置首页推荐栏目。',
    keywords: [
      '发公告', '小程序公告', '发布公告', '公告弹窗', '首页推荐', '首页内容管理',
      '为你推荐', '近期活动', '全职培训横幅', '用户回复', '公告', '弹窗'
    ],
    pages: ['/kgusersvc/appnotice', '/kangaroo/homepick'],
    steps: [
      {
        where: 'admin',
        path: '/kgusersvc/appnotice',
        pageName: '小程序公告',
        perm: 'kangaroo:appnotice:add',
        permLabel: '新增小程序公告',
        text: '打开「小程序公告」，在「发布公告」标签页点「新增」，填「标题」「正文」，选「给谁看」、「进小程序时」（「弹窗提醒一次」或「不弹窗」）和「状态」，点「确 定」。改标题或正文后版本自动 +1 会再弹一次；带固定标识（如 online-guide）的不能删，不想显示请改成「下线」。'
      },
      {
        where: 'admin',
        path: '/kgusersvc/appnotice',
        pageName: '小程序公告',
        perm: 'kangaroo:appnotice:edit',
        permLabel: '回复公告留言',
        text: '用户在小程序给公告留言后，在同页切到「用户回复」标签页，点「查看对话」即可输入内容并点「发送回复」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/homepick',
        pageName: '首页内容管理',
        perm: 'kangaroo:homepick:add',
        permLabel: '新增首页推荐',
        text: '改首页推荐位：打开「首页内容管理」点「新增」，选「首页栏目」（近期活动 / 为你推荐 / 全职培训横幅）和「推荐内容」（须为已开放报名的活动或已发布岗位），填「展示城市」（留空=全国）和「显示顺序」，「状态」选「启用」后点「确 定」。'
      }
    ]
  },
  {
    id: 'feature-switches',
    groupId: 'reports',
    groupTitle: '首页与经营报表',
    title: '打开 / 关闭小程序功能开关',
    summary: '在首页统一控制旅居预订、求职招聘、社区内容、心愿互助、群聊和私信等 6 个前台入口。',
    keywords: [
      '功能开关', '小程序功能开关', '关闭功能', '打开功能', '隐藏功能', '开启功能', '开关',
      '关闭心愿', '心愿功能', '关闭社区', '社区内容功能', '关闭私信', '关闭群聊',
      '关闭招聘', '关闭住宿', '关闭旅居', '隐藏并关闭', '开启并显示'
    ],
    pages: ['/index'],
    steps: [
      {
        where: 'admin',
        path: '/index',
        pageName: '首页·小程序功能开关',
        perm: 'system:config:edit',
        permLabel: '修改小程序功能开关',
        text: '回到首页「小程序功能开关」区域，找到要调整的功能（旅居住宿预订、求职招聘、社区内容功能、心愿互助、群聊与入群、用户私信与交友互动）。'
      },
      {
        where: 'admin',
        path: '/index',
        pageName: '首页·小程序功能开关',
        perm: 'system:config:edit',
        permLabel: '修改小程序功能开关',
        text: '点「隐藏并关闭」或「开启并显示」（社区内容功能为「关闭社区内容」/「开启社区内容」），在确认弹窗点「确认关闭」或「已办妥，开启」；状态不确定时点「刷新状态」。'
      }
    ]
  },
  {
    id: 'community-moderation',
    groupId: 'community',
    groupTitle: '社区与活动',
    title: '审核社区动态、评论、举报与敏感词',
    summary: '处理社区发帖和评论审核、核实用户举报并隐藏违规内容，维护自动拦截敏感词。',
    keywords: [
      '审核动态', '社区动态', '动态评论', '小院评论审核', '举报处理', '敏感词库',
      '敏感词', '置顶动态', '隐藏评论', '违规处理', '社区审核'
    ],
    pages: [
      '/kgcommunity/post',
      '/kgcommunity/postcomment',
      '/kgstays/staycomment',
      '/kgtrade/report',
      '/kgcommunity/sensword'
    ],
    steps: [
      {
        where: 'admin',
        path: '/kgcommunity/post',
        pageName: '社区动态',
        perm: 'kangaroo:post:audit',
        permLabel: '审核社区动态',
        text: '打开「社区动态」，筛选状态「待审核」，点「通过」发布或「驳回 / 隐藏」下线；要置顶帖子点「修改」把「置顶」改成「是」。'
      },
      {
        where: 'admin',
        path: '/kgcommunity/postcomment',
        pageName: '动态评论',
        perm: 'kangaroo:postcomment:audit',
        permLabel: '审核动态评论',
        text: '在「动态评论」点「详情」查看内容，点「通过 / 恢复」或「隐藏」；审核小院住客评论请到「小院评论审核」点「通过」「驳回」或「下架」。',
        extraLinks: [
          { path: '/kgstays/staycomment', pageName: '小院评论审核', perm: 'kangaroo:staycomment:audit', permLabel: '审核小院评论' }
        ]
      },
      {
        where: 'admin',
        path: '/kgtrade/report',
        pageName: '举报处理',
        perm: 'kangaroo:report:handle',
        permLabel: '处理举报',
        text: '打开「举报处理」筛选「待处理」，先点「查看原文」核实，再点「举报成立」（自动隐藏被举报内容）或「不成立」。'
      },
      {
        where: 'admin',
        path: '/kgcommunity/sensword',
        pageName: '敏感词库',
        perm: 'kangaroo:sensword:add',
        permLabel: '新增敏感词',
        text: '维护敏感词：打开「敏感词库」点「新增」，填「词」、选「处理方式」（「直接拦截」或「转人工审核」）和「状态」启用，点「确 定」。'
      }
    ]
  },
  {
    id: 'community-activity',
    groupId: 'community',
    groupTitle: '社区与活动',
    title: '创建社区活动、查看报名与活动退款',
    summary: '新建社区活动或旅游产品并开放报名，按活动查看名单和处理报名退款。',
    keywords: [
      '社区活动', '创建活动', '发布活动', '旅游产品', '活动报名', '活动退款',
      '取消活动', '开放报名', '收费方式', 'AA制'
    ],
    pages: ['/kgcommunity/activity', '/kgcommunity/actsignup', '/kangaroo/homepick'],
    steps: [
      {
        where: 'admin',
        path: '/kgcommunity/activity',
        pageName: '社区活动',
        perm: 'kangaroo:activity:add',
        permLabel: '新增社区活动',
        text: '打开「社区活动」点「新增」，选「发布内容」（社区活动 / 旅游产品）和「门店ID」，填「标题」「集合地点」「开始时间」「结束时间」「名额」和「收费方式」（免费 / 在线支付 / 到场支付 / AA制（现场平摊）），点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kgcommunity/activity',
        pageName: '社区活动',
        perm: 'kangaroo:activity:audit',
        permLabel: '审核社区活动',
        text: '状态为「待审核」时点「通过」即可开放报名；不办了点「取消活动」。若要挂上全职培训横幅，再去「首页内容管理」选择该活动。',
        extraLinks: [
          { path: '/kangaroo/homepick', pageName: '首页内容管理' }
        ]
      },
      {
        where: 'admin',
        path: '/kgcommunity/actsignup',
        pageName: '活动报名',
        perm: 'kangaroo:actsignup:audit',
        permLabel: '审批活动退款',
        text: '打开「活动报名」按「活动ID」查报名名单；有退款申请时，操作列点「同意退款」或「驳回退款」。'
      }
    ]
  },
  {
    id: 'member-and-points',
    groupId: 'members',
    groupTitle: '用户与会员',
    title: '设置会员等级、权益履约和积分商品',
    summary: '调整 6 个会员等级门槛、处理免费间夜与节假日配置、维护合作店权益和积分商城。',
    keywords: [
      '会员等级', '会员等级设置', '会员权益', '积分商品', '积分商城', '积分兑换',
      '权益履约', '会员店铺权益', '免费间夜', '节假日', '登记发货', '核验领取', '取消并退积分'
    ],
    pages: ['/kangaroo/memberlevel', '/kangaroo/memberbenefit', '/kangaroo/point-mall'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/memberlevel',
        pageName: '会员等级设置',
        perm: 'kangaroo:memberlevel:edit',
        permLabel: '修改会员等级',
        text: '打开「会员等级设置」，在「等级设置」标签页对现有 6 级点「修改」（不能增删），调整「等级名称」「所需成长积分」「等级权益（每行一项）」后点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/memberlevel',
        pageName: '会员等级设置',
        perm: 'kangaroo:memberlevel:edit',
        permLabel: '配置会员履约',
        text: '切到同页「积分与权益履约」标签页：在「领取与核销」点「处理申请」，在「住宿权益配置」「活动与培训」点「配置」，在「节假日」点「配置全年节假日」，填完点「确认提交」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/memberbenefit',
        pageName: '会员店铺权益',
        perm: 'kangaroo:memberbenefit:add',
        permLabel: '新增会员店铺权益',
        text: '维护合作店铺折扣：打开「会员店铺权益」点「新增」，填「合作店铺」「权益名称」「城市」「折扣或优惠说明」等并选「上架」，点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/point-mall',
        pageName: '积分商品与兑换',
        perm: 'kangaroo:pointmall:edit',
        permLabel: '管理积分商品与兑换',
        text: '打开「积分商品与兑换」：在「积分商品」标签页点「新增商品」，填「商品名称」「封面图片」「每件所需积分」「当前可兑换库存」「领取方式」，「状态」选「上架」点「保存」；在「兑换记录」点「登记发货」「核验领取」或「取消并退积分」。'
      }
    ]
  },
  {
    id: 'merchant-onboarding',
    groupId: 'stores',
    groupTitle: '门店与商家',
    title: '处理商家入驻申请和商家需求',
    summary: '跟进小程序提交的商家入驻申请，把待平台安排的商家需求派给本地人员或直接发布岗位。',
    keywords: [
      '商家入驻', '商家入驻申请', '商家需求', '重新派单', '等待平台安排',
      '开通门店', '商家服务人', '标记完成', '铃铛'
    ],
    pages: ['/kangaroo/merchantapply', '/kangaroo/merchantrequest', '/kangaroo/grant', '/kangaroo/job'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/merchantapply',
        pageName: '商家入驻申请',
        perm: 'kangaroo:merchantapply:edit',
        permLabel: '跟进商家入驻申请',
        text: '打开「商家入驻申请」：新申请大多自动开通，点「开通门店ID」可跳去补门店资料；停在「待审核」的点「修改」，选「审核状态」并写「跟进备注」点「确 定」。曾撤权或停用门店的账号，需先去「员工授权」恢复授权并启用门店。',
        extraLinks: [
          { path: '/kangaroo/grant', pageName: '员工授权' }
        ]
      },
      {
        where: 'admin',
        path: '/kangaroo/merchantrequest',
        pageName: '商家需求',
        perm: 'kangaroo:merchantrequest:edit',
        permLabel: '处理商家需求',
        text: '打开「商家需求」（点顶栏铃铛也能进）：状态为「等待平台安排」的，先确认该城市已在「员工授权」开通换工主理人或商家服务人，再点「重新派单」；带岗位的点「岗位ID」去「岗位管理」发布；代运营 / 抖音卖房办完点「标记完成」，不做了点「关闭」。',
        extraLinks: [
          { path: '/kangaroo/job', pageName: '岗位管理' }
        ]
      }
    ]
  },
  {
    id: 'insurance-flow',
    groupId: 'finance',
    groupTitle: '财务与保险',
    title: '设置保险方案、登记保单与处理保险退费',
    summary: '先上架保险方案，核对缴费后登记保险公司真实保单号，并审核商家发起的退费申请。',
    keywords: [
      '保险方案', '投保申请', '登记保单', '保单号', '保险退费', '不予办理',
      '同意退费', '不予退费', '核对渠道结果', '投保', '保险'
    ],
    pages: ['/kgstaff/insplan', '/kgstaff/insapply'],
    steps: [
      {
        where: 'admin',
        path: '/kgstaff/insplan',
        pageName: '保险方案',
        perm: 'kangaroo:insplan:add',
        permLabel: '新增保险方案',
        text: '打开「保险方案」点「新增」（或「修改」），填「方案名称」「保障内容」「承保公司」「保费」「保障天数」，「状态」选「上架」，点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kgstaff/insapply',
        pageName: '投保申请',
        perm: 'kangaroo:insapply:handle',
        permLabel: '办理投保与保单登记',
        text: '打开「投保申请」，在「投保申请」标签页点「查看」打开「投保详情」，核对缴费后点「登记保单」，填「保单号（必填）」「实际起保日期（必填）」「实际止保日期（必填）」点「核对后登记」；办不了的点「不予办理」写原因点「确认不予办理」。'
      },
      {
        where: 'admin',
        path: '/kgstaff/insapply',
        pageName: '投保申请',
        perm: 'kangaroo:insapply:handle',
        permLabel: '审核保险退费',
        text: '还没登记保单的退费：切到同页「保险退费」标签页，点「查看并审核」，填「核定退费金额（元）」「审核说明（必填）」，点「同意退费」或「不予退费」，弹窗里点「确认提交」。'
      },
      {
        where: 'miniprogram',
        text: '已经登记了保单的退费，后台不能审核（只能点「查看」看进度）：要在小程序里走完三步——店家补填离店日期 → 换工主理人或城市负责人核实离店日期 → 城市负责人办理退款。'
      },
      {
        where: 'admin',
        path: '/kgstaff/insapply',
        pageName: '投保申请',
        perm: 'kangaroo:insapply:handle',
        permLabel: '核对退费渠道结果',
        text: '原路退回的退费一直显示「渠道处理中」或「退费未完成」时，在退费详情里点「核对渠道结果」：只查实际结果，不会重复退钱。'
      }
    ]
  },
  {
    id: 'withdraw-settlement',
    groupId: 'finance',
    groupTitle: '财务与保险',
    title: '处理结算 / 提现申请与财务页分流',
    summary: '系统只记账不自动打款；提现审批和登记打款必须由两位不同的管理员操作（四眼原则）。',
    keywords: [
      '结算申请', '提现', '打款', '登记打款', '四眼原则', '订单分账', '招聘费用',
      '商家分成结算', '录入月度分成', '登记工资', '分佣规则', '收款账户', '钱包流水'
    ],
    pages: [
      '/kgmanage/withdraw',
      '/kangaroo/business-settlement',
      '/kangaroo/merchantFinance',
      '/kgstays/reimburse',
      '/kgmanage/commission',
      '/kgmanage/payee',
      '/kgmanage/walletentry'
    ],
    steps: [
      {
        where: 'admin',
        path: '/kgmanage/withdraw',
        pageName: '结算申请',
        perm: 'kangaroo:withdraw:audit',
        permLabel: '审核结算申请',
        text: '打开「结算申请」筛选「待审核」，核对金额和收款账户后点「通过」或「驳回」（驳回必填原因）。'
      },
      {
        where: 'admin',
        path: '/kgmanage/withdraw',
        pageName: '结算申请',
        perm: 'kangaroo:withdraw:audit',
        permLabel: '登记打款',
        text: '财务线下完成实际转账后，由另一位有结算审核权限的账号（原审批人按钮是灰的）点「登记打款」填银行流水号等凭证；还没打款前如金额有变可点「退回」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/business-settlement',
        pageName: '订单分账与招聘费用',
        perm: 'kangaroo:businessbill:edit',
        permLabel: '核对账单与登记收付款',
        text: '房费分账与兼职 / 全职服务费：打开「订单分账与招聘费用」，兼职 / 全职先点「登记工资」，再点「查看账单」→「核对并确认金额」→「登记实际付款」或「登记服务费收款」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/merchantFinance',
        pageName: '商家分成结算',
        perm: 'kangaroo:merchantfinance:edit',
        permLabel: '核对与登记商家分成',
        text: '合作商家月度分成（要等这个月过完，次月再结）：第一位财务在「商家分成结算」点「录入月度分成」，填好金额点「保存对账金额」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/merchantFinance',
        pageName: '商家分成结算',
        perm: 'kangaroo:merchantfinance:edit',
        permLabel: '核对与登记商家分成',
        text: '换另一位财务（录入的人不能自己复核）打开这张账单点「复核通过」；商家还有没处理完的处罚复核时点不了。金额不对点「退回核对」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/merchantFinance',
        pageName: '商家分成结算',
        perm: 'kangaroo:merchantfinance:edit',
        permLabel: '核对与登记商家分成',
        text: '线下转账后点「登记实际付款」：实付金额必须和扣完处罚后的应付金额一模一样。小院采购报销不在这里，请走「采购报销」。',
        extraLinks: [
          { path: '/kgstays/reimburse', pageName: '采购报销' }
        ]
      },
      {
        where: 'admin',
        path: '/kgmanage/walletentry',
        pageName: '钱包流水',
        text: '其他相关页面：「钱包流水」查每笔入账、退款冲回，也能补记人工调整（必须写原因）；「分佣规则」按门店设佣金费率；「收款账户」登记收款人的开户行和账号尾号；「商家任务发布费用」设商家发线上任务要不要收费、每条多少钱。',
        extraLinks: [
          { path: '/kgmanage/commission', pageName: '分佣规则' },
          { path: '/kgmanage/payee', pageName: '收款账户' },
          { path: '/kangaroo/publication-fees', pageName: '商家任务发布费用' }
        ]
      }
    ]
  },
  {
    id: 'reports-and-reminders',
    groupId: 'reports',
    groupTitle: '首页与经营报表',
    title: '看数据看板、日报周报与发催报',
    summary: '在数据看板查各小院实时房态与成交，在「日报与月度任务」给未交日报/周报的人员发催报提醒。',
    keywords: [
      '数据看板', '发日报催报', '日报催报', '周报催报', '催报', '催交日报', '日报与月度任务',
      '每日工作报告', '月度目标', '月度总结', '周报', '退回周报', '日报明细', '经营报表'
    ],
    pages: [
      '/kangaroo/dashboard',
      '/kangaroo/operations-reports',
      '/kgmanage/weeklyreport',
      '/kgmanage/dailyentry'
    ],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/dashboard',
        pageName: '数据看板',
        text: '打开「数据看板」，选「昨天」「今天」「明天」和城市、区县、主理人或小院筛选；点击「各地小院」里的任意小院可查看各房型逐间房态。'
      },
      {
        where: 'admin',
        path: '/kangaroo/operations-reports',
        pageName: '日报与月度任务',
        perm: 'kangaroo:operations:remind',
        permLabel: '发送日报/周报催报',
        text: '发催报：打开「日报与月度任务」→ 切「日报/周报催报」标签页 → 选「日报」或「周报」、日期和「城市」→ 点「预览催报对象」→ 勾选未交人员 → 点「发送催报提醒」→ 弹窗点「确认发送」；下方「发送记录」可点「查看提交进度」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/operations-reports',
        pageName: '日报与月度任务',
        perm: 'kangaroo:operations:correct',
        permLabel: '修改日报',
        text: '日报填错了：同页「每日工作报告」找到那份日报点「修改」（只看不改点「查看」）。'
      },
      {
        where: 'admin',
        path: '/kangaroo/operations-reports',
        pageName: '日报与月度任务',
        perm: 'kangaroo:operations:edit',
        permLabel: '管理月度目标与总结',
        text: '「月度目标与进度」点「设置月度目标」，「月度总结」点「生成所选范围总结」或「发送提醒」。'
      },
      {
        where: 'admin',
        path: '/kgmanage/weeklyreport',
        pageName: '周报',
        perm: 'kangaroo:weeklyreport:audit',
        permLabel: '退回周报',
        text: '核对周报去「周报」，点「费用与协同」查看支出和待协同事项，不合格可点「退回」；「日报明细」为只读收支留痕。',
        extraLinks: [
          { path: '/kgmanage/dailyentry', pageName: '日报明细' }
        ]
      }
    ]
  },
  {
    id: 'support-ticket-faq',
    groupId: 'support',
    groupTitle: '客服与审核',
    title: '处理客服工单、维护常见问题',
    summary: '回复用户转人工的客服工单、更新 AI 客服常见问题库，以及查询历史对话记录。',
    keywords: [
      '客服工单', '回复工单', '常见问题', 'FAQ', 'AI客服', 'AI客服聊天记录', '聊天记录', '客服回复'
    ],
    pages: ['/kgusersvc/ticket', '/kgusersvc/faq', '/kgusersvc/supportchat'],
    steps: [
      {
        where: 'admin',
        path: '/kgusersvc/ticket',
        pageName: '客服工单',
        perm: 'kangaroo:ticket:audit',
        permLabel: '回复客服工单',
        text: '打开「客服工单」筛选状态「待处理」，点「详情」看用户问题，再在操作列点「回复」填写解答（会自动发到用户的消息中心）。'
      },
      {
        where: 'admin',
        path: '/kgusersvc/faq',
        pageName: '常见问题',
        perm: 'kangaroo:faq:add',
        permLabel: '维护常见问题',
        text: '打开「常见问题」点「新增」或「修改」，填「问题」、选「分类」、填「解答」，「状态」选「展示」，点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kgusersvc/supportchat',
        pageName: 'AI客服聊天记录',
        text: '需要回溯用户和 AI 袋鼠的对话时，打开「AI客服聊天记录」，按「用户ID」搜索查看（此页只读）。'
      }
    ]
  },
  {
    id: 'dispute-mediation',
    groupId: 'support',
    groupTitle: '客服与审核',
    title: '处理纠纷调解与申诉复核',
    summary: '总部可接手初审、转交城市负责人、处理二次申诉终局复核，并登记实际退款或执行结果。',
    keywords: [
      '纠纷调解', '调解工单', '调解与徽章', '接手初审', '总部复核', '申诉复核',
      '终局结果', '转交本城负责人', '实际执行登记', '商家合作复核', '投诉调解'
    ],
    pages: ['/kangaroo/governance'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/governance',
        pageName: '调解与徽章',
        text: '打开「调解与徽章」，在「调解工单」标签页按状态筛选（「待接单」「总部复核中」等），点操作列「查看工单」或「查看申诉」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/governance',
        pageName: '调解与徽章',
        perm: 'kangaroo:mediation:edit',
        permLabel: '处理调解工单',
        text: '总部接手初审：点「接手初审」→ 填写「用户陈述」「店家陈述」「核实的证据」「核实结论」后点「保存核实记录」→ 填写「责任判定」「裁决依据」「处理措施」「信用及处罚影响」「执行时限（北京时间）」后点「发布初次裁决，交双方确认」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/governance',
        pageName: '调解与徽章',
        perm: 'kangaroo:mediation:edit',
        permLabel: '转交调解工单',
        text: '若需转给本城负责人处理，在工单下方「督导跟进 → 转交本城负责人」填对方小程序账号 ID 和转交原因，点「转交」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/governance',
        pageName: '调解与徽章',
        perm: 'kangaroo:mediation:edit',
        permLabel: '申诉复核与执行登记',
        text: '遇二次申诉（状态「总部复核中」）：点「去填写终局结果」，写满至少 20 字结论后点「提交终局结果并关闭」；完成后在「实际执行登记」填退款单号或凭证点「保存执行记录」。商家刷评等复核在「商家合作复核」标签页处理。'
      }
    ]
  },
  {
    id: 'city-group-qr',
    groupId: 'community',
    groupTitle: '社区与活动',
    title: '更新城市地区换工群二维码与换工联系人',
    summary: '微信群二维码约 7 天过期，要定期更换新码并更新有效期，也可设置固定换工联系人。',
    keywords: [
      '换地区群码', '地区群码', '城市群码', '群二维码', '群码过期', '二维码过期',
      '换工群', '换工联系人', '城市字典', '负责人资料', '地区换工群', '有效期至', '活码'
    ],
    pages: ['/kgusersvc/city'],
    steps: [
      {
        where: 'admin',
        path: '/kgusersvc/city',
        pageName: '城市字典（城市群码）',
        perm: 'kangaroo:city:edit',
        permLabel: '修改城市字典与群码',
        text: '换群二维码：打开「城市字典（城市群码）」，找到对应城市，在操作列点「地区群码」（会自动切到「地区换工群」），上传新的「群二维码」并填「有效期至」，点「确 定」。'
      },
      {
        where: 'admin',
        path: '/kgusersvc/city',
        pageName: '城市字典（城市群码）',
        perm: 'kangaroo:city:edit',
        permLabel: '修改城市字典与群码',
        text: '改固定换工联系人：操作列点「修改」，在「负责人资料」填「换工联系人账号ID」「负责人称呼」等，点「确 定」。'
      }
    ]
  },
  {
    id: 'reimburse-audit',
    groupId: 'finance',
    groupTitle: '财务与保险',
    title: '审核小院采购报销并标记打款',
    summary: '查看门店提交的采购小票凭证，审核通过并在财务线下转账后标记已打款。',
    keywords: [
      '采购报销', '小院报销', '报销审核', '报销打款', '标记已打款', '小票', '报销'
    ],
    pages: ['/kgstays/reimburse'],
    steps: [
      {
        where: 'admin',
        path: '/kgstays/reimburse',
        pageName: '采购报销',
        perm: 'kangaroo:reimburse:audit',
        permLabel: '审核采购报销',
        text: '打开「采购报销」筛选状态「待审核」，点「详情」核对品名、金额和小票凭证，确认无误点「通过」（不符合则点「驳回」并填理由）。'
      },
      {
        where: 'admin',
        path: '/kgstays/reimburse',
        pageName: '采购报销',
        perm: 'kangaroo:reimburse:audit',
        permLabel: '标记报销已打款',
        text: '系统只记账不自动打款：财务线下转账给提交人后，回到列表点「标记已打款」。'
      }
    ]
  },
  {
    id: 'staff-task',
    groupId: 'staff',
    groupTitle: '员工与主理人',
    title: '给员工派发任务并审核回执',
    summary: '可按点名、全体员工或岗位批量派发工作任务，跟进员工提问、延期申请并审核完成回执。',
    keywords: [
      '员工任务派发', '派发任务', '全体员工', '按岗位派发', '审核回执', '完成回执',
      '改截止日期', '转派任务', '给员工派任务'
    ],
    pages: ['/kangaroo/stafftask'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/stafftask',
        pageName: '员工任务派发',
        perm: 'kangaroo:stafftask:add',
        permLabel: '派发员工任务',
        text: '打开「员工任务派发」，点右上角「派发任务」，在「派给谁」选「点名」「全体员工」或「按岗位」，填「任务标题」「任务要求」和可选「截止日期」，点「确认派发」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/stafftask',
        pageName: '员工任务派发',
        perm: 'kangaroo:stafftask:audit',
        permLabel: '审核任务回执',
        text: '员工回复、申请延期或交回执后，列表会标「待处理」，点「去处理」（其余点「查看详情」）：验收点「通过审核」或「驳回，通知修改」，提问或延期在「处理」里选「回复」「改截止日期」「转派」或「关闭任务」。'
      }
    ]
  },
  {
    id: 'wish-audit',
    groupId: 'community',
    groupTitle: '社区与活动',
    title: '审核心愿互助与服务者资质、处理打款',
    summary: '审核心愿发布内容和食品/烟酒等服务者资质文件，完成后登记实际打款。',
    keywords: [
      '心愿互助', '心愿审核', '审核心愿', '心愿打款', '服务者资质', '收款资料',
      '审核通过并展示', '驳回并全额退款', '登记实际打款', '查看私有文件'
    ],
    pages: ['/kangaroo/wishes'],
    steps: [
      {
        where: 'admin',
        path: '/kangaroo/wishes',
        pageName: '心愿互助',
        perm: 'kangaroo:wish:edit',
        permLabel: '审核心愿与登记打款',
        text: '打开「心愿互助」，在「心愿与订单」标签页点「查看处理」：待审核的点「审核通过并展示」或「驳回并全额退款」；完成后线下打款，再点「登记实际打款」填流水号并点「确认已实际打款」。'
      },
      {
        where: 'admin',
        path: '/kangaroo/wishes',
        pageName: '心愿互助',
        perm: 'kangaroo:wish:edit',
        permLabel: '审核服务者资质',
        text: '切到同页「资质 / 收款资料」标签页，点「查看私有文件」核对证件或收款信息，再点「通过」（填有效期和审核依据后点「保存审核结果」）或「驳回」/「撤销」。'
      }
    ]
  }
]

/** 返回某条流程涉及的全部后台页面路径（去重） */
export function guideAdminPaths(guide) {
  const seen = new Set()
  const result = []
  const add = (p) => {
    if (p && !seen.has(p)) {
      seen.add(p)
      result.push(p)
    }
  }
  for (const p of guide.pages || []) add(p)
  for (const step of guide.steps || []) {
    if (step.where === 'admin') {
      add(step.path)
      for (const extra of step.extraLinks || []) add(extra.path)
    }
  }
  return result
}
