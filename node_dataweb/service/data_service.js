const pool = require('../utils/db')

// ---------- seller：[{name, value}] ----------
async function getSeller() {
  const [rows] = await pool.query(
    'SELECT name, sales FROM seller ORDER BY sales DESC'
  )
  // 原 JSON 里 value 是字符串，保持一致
  return rows.map(r => ({ name: r.name, value: String(r.sales) }))
}

// ---------- rank：[{name, value}]（省份销售额） ----------
async function getRank() {
  const [rows] = await pool.query(
    'SELECT name, sales FROM province_sales ORDER BY sales DESC'
  )
  return rows.map(r => ({ name: r.name, value: Number(r.sales) }))
}

// ---------- map：[{name: 组名, children: [{name: 城市, value: [经度, 纬度]}]}] ----------
// 商家分布散点：按用户等级分组，前端 effectScatter 按经纬度渲染
async function getMap() {
  const [rows] = await pool.query(
    'SELECT group_name, city, lng, lat FROM map_point ORDER BY id'
  )
  const groups = []
  const idx = {}
  for (const r of rows) {
    if (!(r.group_name in idx)) {
      idx[r.group_name] = { name: r.group_name, children: [] }
      groups.push(idx[r.group_name])
    }
    idx[r.group_name].children.push({
      name: r.city,
      value: [Number(r.lng), Number(r.lat)]
    })
  }
  return groups
}

// ---------- stock：[{name, stock, sales}] ----------
async function getStock() {
  const [rows] = await pool.query('SELECT name, stock, sales FROM stock')
  return rows
}

// ---------- hot：商品大类→分类→商品 三级树 ----------
async function getHot() {
  const [rows] = await pool.query(
    'SELECT id, name, parent_id, sales FROM hot_goods'
  )
  const build = pid => rows
    .filter(r => r.parent_id === pid)
    .map(r => {
      const children = build(r.id)
      return { name: r.name, value: r.sales, children }
    })
  return build(0)
}

// ---------- trend：{map:{title,base,unit,data:[{name,data:[...]}]}, ...,
//            common:{month:[...]}, type:[{key,text}]} ----------
async function getTrend() {
  const [configs] = await pool.query('SELECT chart, title, base, unit FROM trend_config ORDER BY sort')
  const [series] = await pool.query('SELECT chart, series_name, month_no, value FROM trend_series ORDER BY chart, id')
  const [months] = await pool.query('SELECT label FROM trend_month ORDER BY month_no')

  const result = { common: { month: months.map(m => m.label) }, type: [] }
  for (const c of configs) {
    const chartSeries = series.filter(s => s.chart === c.chart)
    const names = [...new Set(chartSeries.map(s => s.series_name))]
    result[c.chart] = {
      title: c.title,
      base: Number(c.base),
      unit: c.unit,
      data: names.map(n => ({
        name: n,
        data: chartSeries
          .filter(s => s.series_name === n)
          .sort((a, b) => a.month_no - b.month_no)
          .map(s => String(s.value))       // 原 JSON 里月度值是字符串，保持一致
      }))
    }
    result.type.push({ key: c.chart, text: c.title })
  }
  return result
}

// 统一出口：chartName → 函数，和 WebSocket 的 chartName 直接对上
const chartMap = {
  seller: getSeller,
  rank: getRank,
  map: getMap,
  stock: getStock,
  hot: getHot,
  trend: getTrend
}

async function getChartData(chartName) {
  const fn = chartMap[chartName]
  if (!fn) throw new Error('未知的图表类型: ' + chartName)
  return fn()
}

module.exports = { getChartData, chartMap }