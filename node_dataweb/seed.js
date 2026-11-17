const fs = require('fs')
const path = require('path')
const pool = require('./utils/db')

const DATA_DIR = path.join(__dirname, 'data')

async function seed() {
  // 0. 清空旧数据，保证脚本可重复执行
  for (const t of ['seller', 'province_sales', 'map_point', 'stock',
                   'hot_goods', 'trend_config', 'trend_series', 'trend_month']) {
    await pool.query('TRUNCATE TABLE ' + t)
  }

  // 1. seller
  const sellers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'seller.json')))
  for (const s of sellers) {
    await pool.execute('INSERT INTO seller (name, sales) VALUES (?, ?)',
      [s.name, parseInt(s.value)])
  }
  console.log('seller 完成:', sellers.length, '条')

  // 2. rank：省份销售额
  const ranks = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'rank.json')))
  for (const r of ranks) {
    await pool.execute('INSERT INTO province_sales (name, sales) VALUES (?, ?)', [r.name, r.value])
  }
  console.log('rank 完成:', ranks.length, '条')

  // 3. map：用户等级分组 × 城市经纬度
  const maps = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'map.json')))
  let pointCount = 0
  for (const group of maps) {
    for (const pt of group.children) {
      await pool.execute(
        'INSERT INTO map_point (group_name, city, lng, lat) VALUES (?, ?, ?, ?)',
        [group.name, pt.name, pt.value[0], pt.value[1]])
      pointCount++
    }
  }
  console.log('map_point 完成:', pointCount, '条')

  // 3. stock
  const stocks = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'stock.json')))
  for (const s of stocks) {
    await pool.execute('INSERT INTO stock (name, stock, sales) VALUES (?, ?, ?)',
      [s.name, s.stock, s.sales])
  }
  console.log('stock 完成:', stocks.length, '条')

  // 4. hot_goods：三级树递归插入
  const hots = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'hot.json')))
  async function insertTree(nodes, parentId) {
    for (const n of nodes) {
      const [res] = await pool.execute(
        'INSERT INTO hot_goods (name, parent_id, sales) VALUES (?, ?, ?)',
        [n.name, parentId, n.value || 0])
      if (n.children && n.children.length) await insertTree(n.children, res.insertId)
    }
  }
  await insertTree(hots, 0)
  console.log('hot_goods 完成')

  // 5. trend：原始 JSON 是一份接口响应，混有配置/数据线/月份标签/包装字段，
  //    只处理三个图表段（有 title 且 data 是数组的），跳过 common/type/status
  const trend = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trend.json')))

  // 5.1 月份标签
  for (let i = 0; i < trend.common.month.length; i++) {
    await pool.execute('INSERT INTO trend_month (month_no, label) VALUES (?, ?)',
      [i + 1, trend.common.month[i]])
  }

  // 5.2 图表配置 + 数据线（每条线每月一行）
  let sort = 0
  for (const [chart, cfg] of Object.entries(trend)) {
    // 关键防护：非图表字段（common/type/status/statusText）没有 title 和 data，跳过
    if (!cfg || typeof cfg !== 'object' || !cfg.title || !Array.isArray(cfg.data)) continue
    sort++
    await pool.execute(
      'INSERT INTO trend_config (chart, title, base, unit, sort) VALUES (?, ?, ?, ?, ?)',
      [chart, cfg.title, cfg.base, cfg.unit, sort])
    for (const s of cfg.data) {
      for (let m = 0; m < s.data.length; m++) {
        await pool.execute(
          'INSERT INTO trend_series (chart, series_name, month_no, value) VALUES (?, ?, ?, ?)',
          [chart, s.name, m + 1, parseFloat(s.data[m])])
      }
    }
  }
  console.log('trend 完成')

  await pool.end()
  console.log('全部导入完成 ✓')
}

seed().catch(console.error)