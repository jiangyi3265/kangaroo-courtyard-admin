<template>
  <div class="kg-dash" :class="{ 'is-mobile': isMobile }">
    <div class="kg-dash__head">
      <div>
        <h2 class="kg-dash__title">数据看板</h2>
        <div class="kg-dash__sub">{{ updatedText }}</div>
      </div>
      <el-button :icon="Refresh" :size="ctlSize" :loading="loading" @click="load">刷新</el-button>
    </div>

    <!-- 待办：新角色阶段旅居/服务退款由平台审核，有待审的就在最上面提醒（后端旧阶段不给 todo） -->
    <div v-if="refundTodoCount > 0" class="kg-todo" role="status">
      <span class="kg-todo__text">旅居/服务退款待审核 <b>{{ num(refundTodoCount) }}</b> 笔</span>
      <span class="kg-todo__links">
        <template v-for="t in refundTodoLinks" :key="t.name">
          <el-button v-if="t.canOpen" link type="primary" @click="openTodo(t)">{{ t.label }} {{ num(t.count) }} 笔 →</el-button>
          <span v-else class="kg-todo__plain">{{ t.label }} {{ num(t.count) }} 笔</span>
        </template>
      </span>
    </div>

    <!-- ① 总数据：全平台累计，不受下面的筛选影响 -->
    <section class="kg-dash__section">
      <div class="kg-dash__section-head">
        <h3>总数据</h3>
        <span class="kg-dash__hint">全平台累计，不受下面的筛选影响</span>
      </div>
      <div class="kg-cards kg-cards--total" v-loading="loading && !data">
        <div class="kg-card kg-card--hero">
          <div class="kg-card__label">累计成交金额</div>
          <div class="kg-card__value">{{ money(total.gmvFen) }}</div>
          <div class="kg-card__foot">成交 {{ money(total.grossFen) }} · 退款 {{ money(total.refundFen) }}</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">上线小院</div>
          <div class="kg-card__value">{{ num(total.stayCount) }}<small>家</small></div>
          <div class="kg-card__foot">正常门店 {{ num(total.storeCount) }} 家</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">房间总数</div>
          <div class="kg-card__value">{{ num(total.roomTotal) }}</div>
          <div class="kg-card__foot">{{ roomLabelText }}</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">用户数</div>
          <div class="kg-card__value">{{ num(total.userCount) }}<small>人</small></div>
          <div class="kg-card__foot">已付订房 {{ num(total.paidStayOrders) }} 单</div>
        </div>
      </div>
    </section>

    <!-- ② 筛选：日期 + 城市 / 区县 / 主理人 / 小院，选了就刷新 -->
    <section class="kg-dash__section kg-filter">
      <div class="kg-filter__date">
        <el-date-picker
          v-model="filters.date"
          type="date"
          value-format="YYYY-MM-DD"
          format="YYYY年M月D日"
          :clearable="false"
          :editable="false"
          :disabled-date="disabledDate"
          :size="ctlSize"
          placeholder="选日期"
          class="kg-filter__picker"
          @change="load"
        />
        <el-radio-group :model-value="quickKey" :size="ctlSize" class="kg-filter__quick" @change="pickQuick">
          <el-radio-button value="yesterday">昨天</el-radio-button>
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="tomorrow">明天</el-radio-button>
        </el-radio-group>
      </div>
      <div class="kg-filter__grid">
        <el-select v-model="filters.city" placeholder="全部城市" clearable filterable :size="ctlSize" @change="onCity">
          <el-option v-for="c in cityOptions" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filters.district" :placeholder="filters.city ? '全部区县' : '先选城市'" :disabled="!filters.city" clearable filterable :size="ctlSize" @change="onDistrict">
          <el-option v-for="d in districtOptions" :key="d" :label="d" :value="d" />
        </el-select>
        <el-select v-model="filters.host" placeholder="全部主理人" clearable filterable :size="ctlSize" @change="onHost">
          <el-option v-for="h in hostOptions" :key="h.name" :label="h.name + '（' + h.stayCount + ' 家）'" :value="h.name" />
        </el-select>
        <el-select v-model="filters.stayId" placeholder="全部小院" clearable filterable :size="ctlSize" @change="load">
          <el-option v-for="s in stayOptions" :key="s.stayId" :label="s.stayName" :value="s.stayId">
            <span>{{ s.stayName }}</span>
            <span class="kg-filter__opt-sub">{{ [s.city, s.district].filter(Boolean).join(' ') }}</span>
          </el-option>
        </el-select>
        <el-button :icon="RefreshLeft" :size="ctlSize" :disabled="!hasFilter && quickKey === 'today'" @click="resetFilters">重置</el-button>
      </div>
    </section>

    <!-- ③ 当日：受筛选影响 -->
    <section class="kg-dash__section">
      <div class="kg-dash__section-head">
        <h3>{{ dayTitle }}</h3>
        <span class="kg-dash__hint">{{ hasFilter ? '只算筛出来的小院：' + filterText : '全部小院' }}</span>
      </div>
      <div class="kg-cards kg-cards--day" v-loading="loading">
        <div class="kg-card kg-card--hero kg-card--wide">
          <div class="kg-card__label">{{ dayWord }}成交金额</div>
          <div class="kg-card__value">{{ money(day.gmvFen) }}</div>
          <div class="kg-card__foot">共 {{ num(day.payCount) }} 笔付款<template v-if="day.newUsers != null"> · 新用户 {{ num(day.newUsers) }} 人</template></div>
          <ul class="kg-types">
            <li v-for="t in dayTypes" :key="t.type">
              <span>{{ t.label }}</span>
              <span class="kg-types__count">{{ num(t.count) }} 笔</span>
              <b>{{ money(t.fen) }}</b>
            </li>
          </ul>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">{{ dayWord }}退款</div>
          <div class="kg-card__value">{{ money(day.refundFen) }}</div>
          <div class="kg-card__foot">按退款到账那天算</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">{{ dayWord }}入住</div>
          <div class="kg-card__value">{{ num(day.checkIn) }}<small>单</small></div>
          <div class="kg-card__foot">已到店 {{ num(day.checkInArrived) }} 单</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">{{ dayWord }}离店</div>
          <div class="kg-card__value">{{ num(day.checkOut) }}<small>单</small></div>
          <div class="kg-card__foot">已退房 {{ num(day.checkOutDone) }} 单</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">在住 / 房间</div>
          <div class="kg-card__value">{{ num(day.inHouseUnits) }}<small>/ {{ num(day.stockUnits) }}</small></div>
          <div class="kg-card__foot">当晚有人住的间（床位）</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">空房</div>
          <div class="kg-card__value kg-card__value--vacant">{{ num(day.vacantUnits) }}</div>
          <div class="kg-card__foot">当晚还能卖的间（床位）</div>
        </div>
        <div class="kg-card">
          <div class="kg-card__label">入住率</div>
          <div class="kg-card__value">{{ pct(day.occupancyBp) }}</div>
          <div class="kg-meter" aria-hidden="true"><i :style="{ width: barWidth(day.occupancyBp) }" /></div>
        </div>
      </div>
    </section>

    <!-- ④ 按地区：城市 → 区县，每家小院一行（手机上是卡片），点开看房型和房间 -->
    <section class="kg-dash__section">
      <div class="kg-dash__section-head">
        <h3>各地小院</h3>
        <span class="kg-dash__hint">点一家小院，看{{ dayWord }}每个房型、每间房的情况</span>
      </div>
      <el-empty v-if="!loading && !cityGroups.length" :image-size="80" :description="data ? '没有符合条件的小院' : '数据没加载出来，点右上角「刷新」再试一次'" />
      <div v-for="g in cityGroups" :key="g.city" class="kg-city">
        <div class="kg-city__head">
          <span class="kg-city__name">{{ g.city || '未填城市' }}</span>
          <span class="kg-city__sum">在住 {{ num(g.totals.occupied) }}/{{ num(g.totals.stock) }} · 空 {{ num(g.totals.vacant) }} · 成交 {{ money(g.totals.gmvFen) }}</span>
        </div>
        <div v-for="r in g.districts" :key="g.city + '|' + r.district" class="kg-district">
          <div class="kg-district__head">
            <span class="kg-district__name">{{ r.district || '未填区县' }}</span>
            <span class="kg-district__sum">
              在住 {{ num(r.totals.occupied) }}/{{ num(r.totals.stock) }} · 空 {{ num(r.totals.vacant) }} · 入住 {{ num(r.totals.checkIn) }} · 离店 {{ num(r.totals.checkOut) }} · 成交 {{ money(r.totals.gmvFen) }}
            </span>
          </div>
          <div class="kg-stays">
            <div class="kg-stay kg-stay--header" aria-hidden="true">
              <span>小院</span><span>主理人</span><span>区县</span><span>在住 / 房间</span><span>空房</span><span>入住 / 离店</span><span>{{ dayWord }}成交</span><span />
            </div>
            <div
              v-for="s in r.stays"
              :key="s.stayId"
              class="kg-stay"
              role="button"
              tabindex="0"
              :aria-label="'查看 ' + s.stayName + ' 的房间情况'"
              @click="openStay(s)"
              @keydown.enter.prevent="openStay(s)"
              @keydown.space.prevent="openStay(s)"
            >
              <span class="kg-stay__name">
                <b>{{ s.stayName }}</b>
                <small v-if="s.storeName && s.storeName !== s.stayName">{{ s.storeName }}</small>
              </span>
              <span class="kg-stay__host">
                <el-avatar :size="isMobile ? 24 : 28" :src="s.hostAvatar ? imageUrl(s.hostAvatar) : undefined">{{ (s.hostName || '?').slice(0, 1) }}</el-avatar>
                <span>{{ s.hostName || '未填主理人' }}</span>
              </span>
              <span class="kg-stay__dist">{{ s.district || '未填区县' }}</span>
              <span class="kg-stay__occ">
                <span class="kg-stay__occ-text"><b>{{ num(s.occupied) }}</b> / {{ num(s.stock) }}<em>{{ pct(s.occupancyBp) }}</em></span>
                <span class="kg-meter" aria-hidden="true"><i :style="{ width: barWidth(s.occupancyBp) }" /></span>
              </span>
              <span class="kg-stay__vac"><small>空房</small><b :class="{ 'is-zero': !s.vacant }">{{ num(s.vacant) }}</b></span>
              <span class="kg-stay__move"><small>入住 / 离店</small><b>{{ num(s.checkIn) }} / {{ num(s.checkOut) }}</b></span>
              <span class="kg-stay__gmv"><small>{{ dayWord }}成交</small><b>{{ money(s.gmvFen) }}</b></span>
              <el-icon class="kg-stay__arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 小院明细：房型（库存 / 在住 / 空 + 订单）和房间格子 -->
    <el-drawer v-model="drawer.open" :size="isMobile ? '100%' : '720px'" :title="drawer.title" append-to-body class="kg-dash-drawer" @closed="drawer.data = null">
      <div v-loading="drawer.loading" class="kg-detail">
        <template v-if="drawer.data">
          <div class="kg-detail__meta">
            <span>{{ [drawer.data.city, drawer.data.district].filter(Boolean).join(' · ') || '未填地区' }}</span>
            <span>主理人：{{ drawer.data.hostName || '未填' }}</span>
            <span v-if="drawer.data.storeName">门店：{{ drawer.data.storeName }}</span>
            <span>{{ dateLabel(drawer.data.date) }}</span>
          </div>

          <h4 class="kg-detail__h">房型</h4>
          <el-empty v-if="!(drawer.data.roomTypes || []).length" :image-size="60" description="这家小院还没有上架的房型" />
          <div v-for="rt in drawer.data.roomTypes || []" :key="rt.roomTypeId" class="kg-rt">
            <div class="kg-rt__head">
              <b>{{ rt.typeName }}</b>
              <span class="kg-rt__nums">共 {{ num(rt.stock) }} {{ rt.unitLabel || '间' }} · 住 {{ num(rt.occupied) }} · <em>空 {{ num(rt.vacant) }}</em></span>
            </div>
            <div class="kg-meter" aria-hidden="true"><i :style="{ width: ratioWidth(rt.occupied, rt.stock) }" /></div>
            <div v-if="(rt.orders || []).length" class="kg-orders">
              <div v-for="o in rt.orders" :key="o.orderNo" class="kg-order">
                <div class="kg-order__main">
                  <b>{{ o.guestName || '未填姓名' }}</b>
                  <span v-if="o.guestPhoneMasked" class="kg-order__phone">{{ o.guestPhoneMasked }}</span>
                  <el-tag size="small" :type="statusType(o.status)" disable-transitions>{{ o.statusLabel || o.status }}</el-tag>
                </div>
                <div class="kg-order__sub">
                  {{ shortDate(o.checkIn) }} 入住 → {{ shortDate(o.checkOut) }} 离店 · {{ num(o.units) }} {{ rt.unitLabel || '间' }}
                  <span class="kg-order__no">订单号 {{ o.orderNo }}</span>
                </div>
              </div>
            </div>
            <div v-else class="kg-rt__none">{{ dayWordOf(drawer.data.date) }}这个房型没有人住</div>
          </div>

          <template v-if="(drawer.data.units || []).length">
            <h4 class="kg-detail__h">房间</h4>
            <div class="kg-legend">
              <span><i class="kg-chip-dot is-vacant" />空 {{ unitCount('vacant') }}</span>
              <span><i class="kg-chip-dot is-occupied" />住 {{ unitCount('occupied') }}</span>
              <span><i class="kg-chip-dot is-disabled" />停用 {{ unitCount('disabled') }}</span>
            </div>
            <div class="kg-units">
              <div v-for="u in drawer.data.units" :key="u.unitId" class="kg-chip" :class="'is-' + u.state" :title="unitTitle(u)">
                <div class="kg-chip__top"><b>{{ u.unitName }}</b><span>{{ stateLabel(u.state) }}</span></div>
                <div class="kg-chip__type">{{ u.roomTypeName }}</div>
                <template v-if="u.state === 'occupied'">
                  <div class="kg-chip__guest">{{ u.guestName || '有客' }}</div>
                  <div v-if="u.checkOut" class="kg-chip__type">住到 {{ shortDate(u.checkOut) }}</div>
                </template>
              </div>
            </div>
          </template>
          <div v-else class="kg-detail__tip">这家小院还没在员工端排房（没有逐间的房号），所以只按房型显示数量。</div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
/**
 * 后台「数据看板」（菜单「数据看板」和首页共用）。接口 /kangaroo/dashboard/overview、/kangaroo/dashboard/stay/{id}，
 * 金额一律是「分」，这里转成元、保留两位；入住率是基点（万分之几），没有库存时是 null，显示「—」。
 * 总数据不受筛选影响；当日数据和各地小院按 日期 / 城市 / 区县 / 主理人 / 小院 筛选，选了就刷新。
 */
import { ArrowRight, Refresh, RefreshLeft } from '@element-plus/icons-vue'
import { getDashboardOverview, getDashboardStay } from '@/api/kangaroo/dashboard'
import { imageUrl } from '@/utils/imageUrl'
import { checkPermi } from '@/utils/permission'
import useAppStore from '@/store/modules/app'

const appStore = useAppStore()
const router = useRouter()
const isMobile = computed(() => appStore.device === 'mobile')
// 手机上控件用大号（40px 高），手指好点
const ctlSize = computed(() => (isMobile.value ? 'large' : 'default'))

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const TYPE_LABELS = [
  { type: 'stay_order', label: '旅居订房' },
  { type: 'activity_signup', label: '活动报名' },
  { type: 'service_order', label: '增值服务' }
]

/** 北京时间的今天（yyyy-MM-dd），和后端「默认今天」同一口径；offset = 前后几天 */
function shanghaiDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  if (!offset) return parts
  const [y, m, d] = parts.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + offset))
  return t.toISOString().slice(0, 10)
}

const filters = reactive({ date: shanghaiDate(), city: '', district: '', host: '', stayId: undefined })
const data = ref(null)
const loading = ref(false)
const loadedAt = ref('')
let seq = 0

const total = computed(() => (data.value && data.value.total) || {})
const day = computed(() => (data.value && data.value.day) || {})
const options = computed(() => (data.value && data.value.options) || {})

/* ---------- 待办：旅居/服务退款待平台审核（点进对应订单列表，已按「退款待审核」筛好） ---------- */
const todo = computed(() => (data.value && data.value.todo) || null)
const refundTodoLinks = computed(() => {
  if (!todo.value) return []
  return [
    { name: 'KgExtStayOrder', perm: 'kangaroo:stayorder:list', label: '旅居订单', count: Number(todo.value.stayRefundPending) || 0 },
    { name: 'KgExtShopOrder', perm: 'kangaroo:shoporder:list', label: '服务订单', count: Number(todo.value.shopRefundPending) || 0 }
  ].filter(t => t.count > 0).map(t => ({ ...t, canOpen: checkPermi([t.perm]) && router.hasRoute(t.name) }))
})
const refundTodoCount = computed(() => refundTodoLinks.value.reduce((s, t) => s + t.count, 0))
function openTodo(t) {
  router.push({ name: t.name, query: { status: 'refund_pending' } })
}

const quickKey = computed(() => {
  if (filters.date === shanghaiDate(-1)) return 'yesterday'
  if (filters.date === shanghaiDate(0)) return 'today'
  if (filters.date === shanghaiDate(1)) return 'tomorrow'
  return ''
})
const shownDate = computed(() => (data.value && data.value.date) || filters.date)
const isToday = computed(() => (data.value ? !!data.value.today : quickKey.value === 'today'))
const dayWord = computed(() => (isToday.value ? '今日' : '当天'))
const dayTitle = computed(() => dateLabel(shownDate.value) + (isToday.value ? '（今天）' : ''))
const updatedText = computed(() => (loadedAt.value ? '数据更新于 ' + loadedAt.value + '，金额单位：元' : '正在加载…'))

const hasFilter = computed(() => !!(filters.city || filters.district || filters.host || filters.stayId))
const filterText = computed(() => {
  const out = []
  if (filters.city) out.push(filters.city + (filters.district ? ' ' + filters.district : ''))
  if (filters.host) out.push('主理人 ' + filters.host)
  if (filters.stayId) out.push((stayList.value.find(s => s.stayId === filters.stayId) || {}).stayName || '所选小院')
  return out.join(' · ')
})

const roomLabelText = computed(() => {
  const by = total.value.roomTotalByLabel || {}
  const keys = Object.keys(by).filter(k => Number(by[k]) > 0)
  return keys.length ? keys.map(k => k + ' ' + num(by[k])).join(' · ') : '上架房型的默认库存合计'
})
const dayTypes = computed(() => {
  const list = Array.isArray(day.value.byType) ? day.value.byType : []
  // 后端没给的类型也列出来（0 元），三行位置固定，免得每天换位置
  return TYPE_LABELS.map(t => ({ ...t, fen: 0, count: 0, ...(list.find(x => x.type === t.type) || {}) }))
})

/* ---------- 筛选项（后端给的是全量选项，这里按已选的城市 / 区县 / 主理人逐级收窄） ---------- */
const stayList = computed(() => (Array.isArray(options.value.stays) ? options.value.stays : []))
const cityOptions = computed(() => (Array.isArray(options.value.cities) ? options.value.cities.filter(Boolean) : []))
const districtOptions = computed(() => {
  const map = options.value.districts || {}
  // 「未填区县」不能当筛选值（空值等于不筛），所以不放进下拉
  return (filters.city && Array.isArray(map[filters.city]) ? map[filters.city] : []).filter(Boolean)
})
function stayMatches(s, { host = true } = {}) {
  if (filters.city && s.city !== filters.city) return false
  if (filters.district && s.district !== filters.district) return false
  if (host && filters.host && s.hostName !== filters.host) return false
  return true
}
const hostOptions = computed(() => {
  const all = Array.isArray(options.value.hosts) ? options.value.hosts.filter(h => h && h.name) : []
  if (!filters.city) return all
  const names = new Set(stayList.value.filter(s => stayMatches(s, { host: false })).map(s => s.hostName))
  return all.filter(h => names.has(h.name) || h.name === filters.host)
})
const stayOptions = computed(() => stayList.value.filter(s => stayMatches(s) || s.stayId === filters.stayId))

function dropStayIfOutside() {
  if (filters.stayId == null) return
  const s = stayList.value.find(x => x.stayId === filters.stayId)
  if (!s || !stayMatches(s)) filters.stayId = undefined
}
function onCity() {
  filters.district = ''
  dropStayIfOutside()
  load()
}
function onDistrict() {
  dropStayIfOutside()
  load()
}
function onHost() {
  dropStayIfOutside()
  load()
}
function pickQuick(key) {
  filters.date = shanghaiDate(key === 'yesterday' ? -1 : key === 'tomorrow' ? 1 : 0)
  load()
}
function resetFilters() {
  Object.assign(filters, { date: shanghaiDate(), city: '', district: '', host: '', stayId: undefined })
  load()
}
// 和后端一致：往前最多一年，往后最多 180 天
function disabledDate(d) {
  const ymd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return ymd < shanghaiDate(-365) || ymd > shanghaiDate(180)
}

/* ---------- 地区分组：后端按 城市+区县 一组，这里再按城市归拢，城市的合计由各区县相加 ---------- */
const cityGroups = computed(() => {
  const regions = (data.value && Array.isArray(data.value.regions)) ? data.value.regions : []
  const out = []
  const byCity = new Map()
  regions.forEach(r => {
    const city = r.city || ''
    let g = byCity.get(city)
    if (!g) {
      g = { city, districts: [], totals: { stock: 0, occupied: 0, vacant: 0, checkIn: 0, checkOut: 0, gmvFen: 0 } }
      byCity.set(city, g)
      out.push(g)
    }
    const t = r.totals || {}
    Object.keys(g.totals).forEach(k => { g.totals[k] += Number(t[k]) || 0 })
    g.districts.push({ district: r.district || '', totals: t, stays: Array.isArray(r.stays) ? r.stays : [] })
  })
  return out
})

/* ---------- 读数据 ---------- */
function params() {
  const p = { date: filters.date }
  if (filters.city) p.city = filters.city
  if (filters.district) p.district = filters.district
  if (filters.host) p.host = filters.host
  if (filters.stayId != null) p.stayId = filters.stayId
  return p
}
function load() {
  const my = ++seq
  loading.value = true
  getDashboardOverview(params()).then(res => {
    if (my !== seq) return
    data.value = res.data || null
    const now = new Date()
    loadedAt.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  }).catch(() => {
    // 具体原因 request.js 已经弹过；留着上一次的数字会让人当成这次筛选的结果，所以清掉，页面提示点「刷新」
    if (my === seq) data.value = null
  }).finally(() => {
    if (my === seq) loading.value = false
  })
}

/* ---------- 小院明细抽屉 ---------- */
const drawer = reactive({ open: false, loading: false, title: '', stayId: null, data: null })
function openStay(s) {
  drawer.open = true
  drawer.title = s.stayName
  drawer.stayId = s.stayId
  drawer.data = null
  drawer.loading = true
  const stayId = s.stayId
  getDashboardStay(stayId, { date: shownDate.value }).then(res => {
    if (drawer.stayId !== stayId || !drawer.open) return
    drawer.data = res.data || { roomTypes: [], units: [] }
  }).catch(() => {
    if (drawer.stayId === stayId) drawer.open = false
  }).finally(() => {
    if (drawer.stayId === stayId) drawer.loading = false
  })
}
function unitCount(state) {
  return ((drawer.data && drawer.data.units) || []).filter(u => u.state === state).length
}
function stateLabel(state) {
  return state === 'occupied' ? '住' : state === 'disabled' ? '停用' : '空'
}
function unitTitle(u) {
  if (u.state !== 'occupied') return u.unitName + ' · ' + stateLabel(u.state)
  return u.unitName + ' · ' + (u.guestName || '有客') + (u.checkIn ? ' · ' + shortDate(u.checkIn) + ' 入住' : '') + (u.checkOut ? ' → ' + shortDate(u.checkOut) + ' 离店' : '') + (u.orderNo ? ' · 订单号 ' + u.orderNo : '')
}
function statusType(st) {
  if (st === 'checked_in') return 'success'
  if (st === 'confirmed') return 'primary'
  if (st === 'completed') return 'info'
  return 'warning'
}

/* ---------- 格式 ---------- */
/** 分 → 「¥1,234.56」，整数运算，不经过浮点；null 显示「—」 */
function money(fen) {
  if (fen === null || fen === undefined || fen === '' || isNaN(Number(fen))) return '—'
  const n = Math.round(Number(fen))
  const abs = Math.abs(n)
  const yuan = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-¥' : '¥') + yuan + '.' + String(abs % 100).padStart(2, '0')
}
function num(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—'
  return String(Math.round(Number(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
/** 基点 → 百分比，保留一位小数（和员工端每日概况同一写法：46.15% 显示 46.2%，整数不带 .0） */
function pct(bp) {
  if (bp === null || bp === undefined || bp === '' || isNaN(Number(bp))) return '—'
  const tenths = Math.floor((Number(bp) + 5) / 10)
  return tenths % 10 === 0 ? tenths / 10 + '%' : Math.floor(tenths / 10) + '.' + (tenths % 10) + '%'
}
function barWidth(bp) {
  if (bp === null || bp === undefined || isNaN(Number(bp))) return '0%'
  return Math.max(0, Math.min(100, Number(bp) / 100)) + '%'
}
function ratioWidth(a, b) {
  const x = Number(a) || 0
  const y = Number(b) || 0
  return y > 0 ? Math.min(100, (x * 100) / y) + '%' : '0%'
}
function dateLabel(ymd) {
  if (!ymd) return ''
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return m + '月' + d + '日 ' + WEEK[w]
}
function shortDate(ymd) {
  if (!ymd) return ''
  const [, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  return m + '月' + d + '日'
}
function dayWordOf(ymd) {
  return ymd && String(ymd).slice(0, 10) === shanghaiDate() ? '今天' : '这天'
}

load()
</script>

<style lang="scss">
/* 看板自己的颜色：空房绿、在住棕、停用灰（暗色模式另配一套，和 html.dark 一起切换） */
.kg-dash,
.kg-dash-drawer {
  --kg-card-bg: var(--el-bg-color-overlay, #fff);
  --kg-line: var(--el-border-color-lighter, #ebeef5);
  --kg-muted: var(--el-text-color-secondary, #909399);
  --kg-ink: var(--el-text-color-primary, #303133);
  --kg-soft: var(--el-fill-color-light, #f5f7fa);
  --kg-occupied: #8a5a34;
  --kg-occupied-soft: #f4ebe2;
  --kg-occupied-ink: #6b4325;
  --kg-vacant: #2e8b57;
  --kg-vacant-soft: #e7f5ec;
  --kg-vacant-ink: #1f6b40;
  --kg-disabled-soft: #f0f1f3;
  --kg-disabled-ink: #8d9095;
  --kg-meter-track: #efe7df;
}
html.dark .kg-dash,
html.dark .kg-dash-drawer {
  --kg-occupied: #9a6840;
  --kg-occupied-soft: #3a2a1d;
  --kg-occupied-ink: #e6c3a3;
  --kg-vacant: #4fb57a;
  --kg-vacant-soft: #183326;
  --kg-vacant-ink: #8fd9ad;
  --kg-disabled-soft: #2a2b2d;
  --kg-disabled-ink: #8d9095;
  --kg-meter-track: #33302d;
}
.kg-dash-drawer .el-drawer__header {
  margin-bottom: 8px;
}
.kg-dash-drawer .el-drawer__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>

<style scoped lang="scss">
.kg-dash {
  color: var(--kg-ink);
  max-width: 1400px;
}
.kg-dash__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.kg-dash__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
}
.kg-dash__sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--kg-muted);
}
.kg-dash__section {
  margin-bottom: 20px;
}
/* 待办提醒条：浅橙底，和卡片同圆角 */
.kg-todo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--el-color-warning-light-5, #f3d19e);
  background: var(--el-color-warning-light-9, #fdf6ec);
  font-size: 14px;

  b {
    font-size: 16px;
    color: var(--el-color-warning-dark-2, #b88230);
    font-variant-numeric: tabular-nums;
  }
}
.kg-todo__links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;

  .el-button {
    margin-left: 0;
  }
}
.kg-todo__plain {
  color: var(--kg-muted);
}
.kg-dash__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin-bottom: 10px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}
.kg-dash__hint {
  font-size: 13px;
  color: var(--kg-muted);
  min-width: 0;
  overflow-wrap: anywhere;
}

/* ---------- 卡片 ---------- */
.kg-cards {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.kg-cards--day {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.kg-card {
  background: var(--kg-card-bg);
  border: 1px solid var(--kg-line);
  border-radius: 8px;
  padding: 14px 16px;
  min-width: 0;
}
.kg-card--wide {
  grid-row: span 2;
}
.kg-card__label {
  font-size: 13px;
  color: var(--kg-muted);
}
.kg-card__value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;

  small {
    margin-left: 4px;
    font-size: 13px;
    font-weight: 400;
    color: var(--kg-muted);
  }
}
.kg-card--hero .kg-card__value {
  font-size: 28px;
}
.kg-card__value--vacant {
  color: var(--kg-vacant-ink);
}
.kg-card__foot {
  margin-top: 6px;
  font-size: 12px;
  color: var(--kg-muted);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.kg-types {
  list-style: none;
  margin: 12px 0 0;
  padding: 10px 0 0;
  border-top: 1px dashed var(--kg-line);

  li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 4px 0;
    font-size: 14px;
  }
  b {
    margin-left: auto;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}
.kg-types__count {
  font-size: 12px;
  color: var(--kg-muted);
}
.kg-meter {
  display: block;
  height: 6px;
  margin-top: 10px;
  border-radius: 3px;
  background: var(--kg-meter-track);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--kg-occupied);
    transition: width 0.3s;
  }
}

/* ---------- 筛选 ---------- */
.kg-filter {
  background: var(--kg-card-bg);
  border: 1px solid var(--kg-line);
  border-radius: 8px;
  padding: 12px;
}
.kg-filter__date {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}
.kg-filter__date :deep(.el-date-editor) {
  width: 200px;
}
.kg-filter__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  gap: 10px;
}
.kg-filter__opt-sub {
  float: right;
  margin-left: 12px;
  font-size: 12px;
  color: var(--kg-muted);
}

/* ---------- 地区 / 小院 ---------- */
.kg-city {
  margin-bottom: 16px;
}
.kg-city__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  padding: 8px 2px;
  border-bottom: 2px solid var(--kg-line);
}
.kg-city__name {
  font-size: 17px;
  font-weight: 600;
}
.kg-city__sum,
.kg-district__sum {
  font-size: 13px;
  color: var(--kg-muted);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.kg-district {
  margin-top: 10px;
}
.kg-district__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  padding: 4px 2px 8px;
}
.kg-district__name {
  font-size: 14px;
  font-weight: 600;
}
.kg-stays {
  border: 1px solid var(--kg-line);
  border-radius: 8px;
  overflow: hidden;
  background: var(--kg-card-bg);
}
/* 电脑：一行一家，像表格 */
.kg-stay {
  display: grid;
  grid-template-columns: minmax(150px, 2fr) minmax(120px, 1.3fr) minmax(70px, 0.8fr) minmax(150px, 1.6fr) 64px 92px 110px 20px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid var(--kg-line);
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: background 0.15s;

  &:hover,
  &:focus-visible {
    background: var(--kg-soft);
  }
  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--el-color-primary);
  }
  > * {
    min-width: 0;
  }
  small {
    display: none;
  }
  b {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}
.kg-stay--header {
  cursor: default;
  border-top: 0;
  background: var(--kg-soft);
  font-size: 12px;
  color: var(--kg-muted);
  padding-top: 8px;
  padding-bottom: 8px;

  &:hover {
    background: var(--kg-soft);
  }
}
.kg-stay__name {
  display: flex;
  flex-direction: column;

  b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    display: block;
    font-size: 12px;
    color: var(--kg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.kg-stay__host {
  display: flex;
  align-items: center;
  gap: 8px;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :deep(.el-avatar) {
    flex: 0 0 auto;
    background: var(--kg-occupied-soft);
    color: var(--kg-occupied-ink);
    font-size: 13px;
  }
}
.kg-stay__dist {
  color: var(--kg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kg-stay__occ .kg-meter {
  margin-top: 6px;
}
.kg-stay__occ-text {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;

  em {
    margin-left: auto;
    font-style: normal;
    font-size: 12px;
    color: var(--kg-muted);
  }
}
.kg-stay__vac b {
  color: var(--kg-vacant-ink);

  &.is-zero {
    color: var(--kg-muted);
  }
}
.kg-stay__gmv,
.kg-stay--header > span:nth-child(7) {
  text-align: right;
}
.kg-stay__arrow {
  color: var(--kg-muted);
}

/* ---------- 小院明细抽屉 ---------- */
.kg-detail {
  min-height: 200px;
}
.kg-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 13px;
  color: var(--kg-muted);
  margin-bottom: 8px;
}
.kg-detail__h {
  margin: 18px 0 10px;
  font-size: 15px;
  font-weight: 600;
}
.kg-detail__tip {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--kg-soft);
  font-size: 13px;
  color: var(--kg-muted);
  line-height: 1.6;
}
.kg-rt {
  border: 1px solid var(--kg-line);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}
.kg-rt__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;

  b {
    font-size: 15px;
  }
}
.kg-rt__nums {
  font-size: 13px;
  color: var(--kg-muted);
  font-variant-numeric: tabular-nums;

  em {
    font-style: normal;
    color: var(--kg-vacant-ink);
    font-weight: 600;
  }
}
.kg-rt__none {
  margin-top: 10px;
  font-size: 13px;
  color: var(--kg-muted);
}
.kg-orders {
  margin-top: 10px;
}
.kg-order {
  padding: 8px 0;
  border-top: 1px dashed var(--kg-line);
}
.kg-order__main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}
.kg-order__phone {
  font-size: 13px;
  color: var(--kg-muted);
  font-variant-numeric: tabular-nums;
}
.kg-order__sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
.kg-order__no {
  display: inline-block;
  margin-left: 8px;
  color: var(--kg-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.kg-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--kg-muted);

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}
.kg-chip-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;

  &.is-vacant {
    background: var(--kg-vacant-soft);
    border: 1px solid var(--kg-vacant);
  }
  &.is-occupied {
    background: var(--kg-occupied);
  }
  &.is-disabled {
    background: var(--kg-disabled-soft);
    border: 1px dashed var(--kg-disabled-ink);
  }
}
.kg-units {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 8px;
}
.kg-chip {
  min-height: 64px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  min-width: 0;

  &.is-vacant {
    background: var(--kg-vacant-soft);
    color: var(--kg-vacant-ink);
    border: 1px solid var(--kg-vacant);
  }
  &.is-occupied {
    background: var(--kg-occupied);
    color: #fff;
    border: 1px solid var(--kg-occupied);
  }
  &.is-disabled {
    background: var(--kg-disabled-soft);
    color: var(--kg-disabled-ink);
    border: 1px dashed var(--kg-disabled-ink);
  }
}
.kg-chip__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;

  b {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    flex: 0 0 auto;
    font-weight: 600;
  }
}
.kg-chip__type,
.kg-chip__guest {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kg-chip__type {
  opacity: 0.85;
}
.kg-chip__guest {
  font-weight: 600;
}

/* ---------- 平板 ---------- */
@media (max-width: 1200px) {
  .kg-cards--day {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .kg-filter__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ---------- 手机：卡片 ---------- */
@media (max-width: 768px) {
  .kg-dash__title {
    font-size: 20px;
  }
  .kg-cards,
  .kg-cards--day {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .kg-card {
    padding: 12px;
  }
  .kg-card--hero {
    grid-column: 1 / -1;
  }
  /* 总数据：大卡占一行，下面三张小卡并排，不留单张 */
  .kg-cards--total {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    .kg-card {
      padding: 10px;
    }
    .kg-card--hero {
      padding: 12px;
    }
    /* 10-19 复查：手机上三张小卡一格约 100px，「正常门店 328 家」「已付订房 182 单」末尾的字会掉到第二行；小字收一号 */
    .kg-card:not(.kg-card--hero) .kg-card__foot {
      font-size: 11px;
    }
  }
  .kg-card--wide {
    grid-row: auto;
  }
  .kg-card__value {
    font-size: 20px;
  }
  .kg-card--hero .kg-card__value {
    font-size: 26px;
  }
  .kg-filter {
    padding: 10px;
  }
  .kg-filter__date {
    display: grid;
    grid-template-columns: 1fr;
  }
  .kg-filter__date :deep(.el-date-editor) {
    width: 100%;
  }
  .kg-filter__quick {
    display: flex;

    :deep(.el-radio-button) {
      flex: 1 1 0;
    }
    :deep(.el-radio-button__inner) {
      width: 100%;
    }
  }
  .kg-filter__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    > .el-button {
      grid-column: 1 / -1;
      margin-left: 0;
    }
  }
  .kg-stays {
    border: 0;
    background: transparent;
    display: grid;
    gap: 8px;
  }
  .kg-stay--header {
    display: none;
  }
  .kg-stay {
    position: relative;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-areas:
      'name name name'
      'host host dist'
      'occ  occ  occ'
      'vac  move gmv';
    gap: 10px 8px;
    padding: 12px 36px 12px 12px;
    border: 1px solid var(--kg-line);
    border-radius: 8px;
    background: var(--kg-card-bg);

    small {
      display: block;
      font-size: 12px;
      color: var(--kg-muted);
      margin-bottom: 2px;
    }
  }
  .kg-stay__name {
    grid-area: name;

    b {
      font-size: 16px;
    }
  }
  .kg-stay__host {
    grid-area: host;
    font-size: 13px;
  }
  .kg-stay__dist {
    grid-area: dist;
    text-align: right;
    font-size: 13px;
  }
  .kg-stay__occ {
    grid-area: occ;
  }
  .kg-stay__vac {
    grid-area: vac;
  }
  .kg-stay__move {
    grid-area: move;
  }
  .kg-stay__gmv {
    grid-area: gmv;
    text-align: left;
  }
  .kg-stay__vac,
  .kg-stay__move,
  .kg-stay__gmv {
    display: flex;
    flex-direction: column;

    b {
      font-size: 15px;
      overflow-wrap: anywhere;
    }
  }
  .kg-stay__arrow {
    position: absolute;
    top: 14px;
    right: 12px;
  }
  .kg-units {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
