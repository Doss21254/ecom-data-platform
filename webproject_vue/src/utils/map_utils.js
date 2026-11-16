// GeoJSON 中的省级 GB 代码以 156 开头，共 9 位，末四位为 0000。
const provinceCodePattern = /^156\d{6}$/

// 从 public/assets 加载 GeoJSON；BASE_URL 也能兼容部署在子路径下的应用。
export async function loadGeoJSON(fileName) {
  const url = `${process.env.BASE_URL}assets/${encodeURIComponent(fileName)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GeoJSON 请求失败：${fileName}，HTTP ${response.status}`)
  }
  return response.json()
}

// 地图点击事件只返回省名，用名称和行政区划代码共同识别省级要素。
export function getProvinceFeature(geoJSON, provinceName) {
  return geoJSON.features.find(feature => (             // find 遍历出geoJSON数组中第一个符合条件的数据
    feature.properties.name === provinceName &&
    provinceCodePattern.test(String(feature.properties.gb || '')) &&
    String(feature.properties.gb).endsWith('0000')
  ))
}

// 为不同省份生成独立的 ECharts 地图名，避免注册时相互覆盖。
export function getProvinceMapName(provinceFeature) {
  return `province-${provinceFeature.properties.gb}`
}

// 市级 GeoJSON 同时包含全国城市，按省级代码前缀提取当前省的城市要素。
export function getProvinceGeoJSON(cityGeoJSON, provinceFeature) {
  const provinceCode = String(provinceFeature.properties.gb).slice(0, 5)
  const features = cityGeoJSON.features.filter(feature => (
    String(feature.properties.gb || '').startsWith(provinceCode)
  ))
  if (features.length === 0) {
    throw new Error(`没有找到${provinceFeature.properties.name}的市级地图数据。`)
  }
  return {
    type: 'FeatureCollection',
    features
  }
}

// 省级视图只保留属于该省的散点城市；地图和接口数据的名称可能带“市”后缀。
export function filterPointGroups(groups, cityFeatures) {
  const cityNames = new Set(
    cityFeatures.map(feature => normalizeCityName(feature.properties.name))
  )
  return groups
    .filter(group => group && Array.isArray(group.children))
    .map(group => ({
      ...group,
      children: group.children.filter(point => cityNames.has(normalizeCityName(point.name)))
    }))
    .filter(group => group.children.length > 0)
}

// 统一城市名称格式，让“广州”和“广州市”能够匹配。
function normalizeCityName(name) {
  return typeof name === 'string' ? name.replace(/市$/, '') : ''
}
