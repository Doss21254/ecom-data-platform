const mysql = require('mysql2/promise')
require('dotenv').config()

// 连接池：处理并发查询，避免每次请求都建新连接
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PWD,
  database: 'ecom_screen',
  waitForConnections: true,
  connectionLimit: 10,          // 最多 10 个连接
  queueLimit: 0,
  charset: 'utf8mb4'            // 支持中文
})

// // 测试连接（Promise写法）
// (async () => {
//   const [res] = await pool.query('select 1');
//   console.log('✅ 数据库连接正常', res);
// })().catch(err => {
//   console.error('❌ 数据库连接失败：', err);
// })

module.exports = pool