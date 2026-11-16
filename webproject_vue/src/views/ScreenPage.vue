<template>
  <main class="screen-page" :style="themeVariables">
    <header class="screen-header">
      <div class="screen-heading">
        <p class="screen-eyebrow">E-COMMERCE DATA CENTER</p>
        <div class="heading-title-row">
          <h1>电商运营数据可视化大屏</h1>
          <button
            class="theme-button"
            type="button"
            :aria-label="`切换图表主题，当前主题：${chartTheme}`"
            :title="`切换到 ${nextChartThemeLabel} 主题`"
            @click="toggleChartTheme"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">  
              <!-- 主题切换的图标描绘 -->
              <path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.5-3.3 1.7 1.7 0 0 1 1.3-2.8H18a3 3 0 0 0 3-3c0-5-4-8.9-9-8.9Z" />
              <circle cx="7.5" cy="10" r="1" />
              <circle cx="11" cy="7" r="1" />
              <circle cx="15.5" cy="8" r="1" />
            </svg>
          </button>
        </div>
      </div>
      <div class="screen-status">
        <span class="status-dot"></span>
        实时数据看板
      </div>
    </header>

    <section class="dashboard-grid" aria-label="运营数据图表">
      <article
        v-for="panel in panels"
        :key="panel.id"
        class="dashboard-panel"
        :class="[`panel-${panel.id}`, { 'is-fullscreen': fullscreenPanelId === panel.id }]"
        :data-panel-id="panel.id"
      >
        <!-- 按钮控制当前卡片的原生全屏状态；全屏后图标与辅助文本同步切换。 -->
        <button
          class="fullscreen-button"
          type="button"
          :aria-label="fullscreenPanelId === panel.id ? '退出图表全屏' : '图表全屏'"
          :title="fullscreenPanelId === panel.id ? '退出全屏 (Esc)' : '全屏显示'"
          @click="toggleFullscreen(panel.id, $event)"
        >
          {{ fullscreenPanelId === panel.id ? '⤢' : '⛶' }}
        </button>
        <div class="panel-content">
          <component :is="panel.component"></component>
        </div>
      </article>
    </section>
  </main>
</template>

<script>
import SellerPage from './SellerPage.vue'
import TrendPage from './TrendPage.vue'
import MapPage from './mapPage.vue'
import RankPage from './RankPage.vue'
import HotPage from './HotPage.vue'
import StockPage from './StockPage.vue'
import { getThemeConfig } from '../utils/theme_utils'

export default {
  components: {
    SellerPage,
    TrendPage,
    MapPage,
    RankPage,
    HotPage,
    StockPage
  },
  data() {
    return {
      fullscreenPanelId: null,
      applyingRemoteFullscreen: false,
      panels: [
        { id: 'trend', component: TrendPage },
        { id: 'map', component: MapPage },
        { id: 'hot', component: HotPage },
        { id: 'seller', component: SellerPage },
        { id: 'rank', component: RankPage },
        { id: 'stock', component: StockPage }
      ]
    }
  },
  computed: {
    chartTheme() {
      return this.$store.state.chartTheme === 'hjh' ? 'HJH' : 'Vintage'
    },
    nextChartThemeLabel() {
      return this.$store.getters.nextChartThemeLabel
    },
    themeVariables() {
      return getThemeConfig(this.$store.state.chartTheme).variables
    }
  },
  mounted() {
    // 监听浏览器全屏状态变化，以同步按钮状态，也覆盖用户按 Esc 退出的场景。
    document.addEventListener('fullscreenchange', this.handleFullscreenChange)
    window.addEventListener('keydown', this.handleFullscreenKeydown)
    this.$socket.registerCallback('fullScreen', this.applyRemoteFullscreen)
    if (window.ResizeObserver) {
      // 监听每张图表面板的内容尺寸，面板全屏或还原后触发图表重新布局。
      this.panelResizeObserver = new ResizeObserver(this.notifyChartsResize)
      this.$el.querySelectorAll('.panel-content').forEach(panel => {
        this.panelResizeObserver.observe(panel)
      })
    }
  },
  beforeDestroy() {
    if (this.fullscreenPanelId && this.$socket.connected) {
      // 大屏页面卸载时清除共享全屏状态，避免其他客户端停留在旧图表全屏界面。
      this.$socket.send({
        action: 'fullScreen',
        socketType: 'fullScreen',
        panelId: null,
        isFullScreen: false
      })
    }
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
    window.removeEventListener('keydown', this.handleFullscreenKeydown)
    this.$socket.unRegisterCallback('fullScreen')
    if (this.panelResizeObserver) {
      // 组件卸载时停止尺寸观察，避免遗留监听器。
      this.panelResizeObserver.disconnect()
      this.panelResizeObserver = null
    }
    // 清除尚未执行的 resize 通知，避免组件销毁后继续触发。
    clearTimeout(this.resizeNotifyTimer)
  },
  methods: {
    toggleChartTheme() {
      this.$store.commit('toggleChartTheme')  // 做切换主题的操作
    },
    async toggleFullscreen(panelId, event) {
      // 按钮所在卡片就是本次切换的全屏目标。
      const panel = event.currentTarget.closest('.dashboard-panel')
      if (!panel) {
        return
      }

      try {
        if (this.fullscreenPanelId === panelId) {
          if (document.fullscreenElement === panel) {
            // 再次点击当前卡片的按钮时退出浏览器原生全屏。
            await document.exitFullscreen()
          } else {
            // 同步到本页的全屏状态是 CSS 模拟模式，按钮点击时直接广播退出。
            this.setFullscreenState(null)
          }
        } else {
          // 浏览器一次只允许一个元素全屏，先退出其他全屏卡片再切换目标。
          if (document.fullscreenElement) {
            await document.exitFullscreen()
          }
          await panel.requestFullscreen()
        }
      } catch (error) {
        console.error('切换图表全屏失败：', error)
      }
    },
    handleFullscreenChange() {
      // 以浏览器实际全屏元素为准，支持 Esc 或浏览器控件触发的退出操作。
      const fullscreenElement = document.fullscreenElement
      const panelId = fullscreenElement
        ? fullscreenElement.dataset.panelId
        : null
      this.setFullscreenState(panelId, !this.applyingRemoteFullscreen)
    },
    handleFullscreenKeydown(event) {
      // CSS 模拟全屏没有触发浏览器原生 Esc 行为，因此在同步端手动退出。
      if (event.key === 'Escape' && this.fullscreenPanelId && !document.fullscreenElement) {
        this.setFullscreenState(null)
      }
    },
    applyRemoteFullscreen(payload) {
      const validPanel = this.panels.some(panel => panel.id === payload.panelId)
      const nextPanelId = payload.isFullScreen && validPanel ? payload.panelId : null
      const currentNativePanelId = document.fullscreenElement
        ? document.fullscreenElement.dataset.panelId
        : null

      if (this.fullscreenPanelId === nextPanelId && currentNativePanelId === nextPanelId) {
        return
      }

      this.applyingRemoteFullscreen = true
      const exitNativeFullscreen = document.fullscreenElement && currentNativePanelId !== nextPanelId
        ? document.exitFullscreen().catch(error => {
          console.error('退出本地全屏失败：', error)
        })
        : Promise.resolve()

      exitNativeFullscreen.then(() => {
        this.setFullscreenState(nextPanelId, false)
        this.$nextTick(() => {
          this.applyingRemoteFullscreen = false
        })
      })
    },
    setFullscreenState(panelId, broadcast = true) {
      this.fullscreenPanelId = panelId
      if (broadcast) {
        this.$socket.send({
          action: 'fullScreen',
          socketType: 'fullScreen',
          panelId,
          isFullScreen: Boolean(panelId)
        })
      }
      this.notifyChartsResize()
    },
    notifyChartsResize() {
      // 合并全屏切换期间连续的尺寸变化，待布局稳定后统一通知 ECharts。
      clearTimeout(this.resizeNotifyTimer)
      this.resizeNotifyTimer = setTimeout(() => {
        this.resizeNotifyTimer = null
        window.dispatchEvent(new Event('resize'))
      }, 100)
    }
  }
}
</script>

<style lang="css" scoped>
/* 全屏大屏的基础容器：纵向排列标题与图表区，并铺设深色渐变背景。 */
.screen-page {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
  padding: 14px 20px 20px;
  overflow: hidden;
  color: var(--primary-text);
  background:
    radial-gradient(ellipse at 50% -20%, var(--page-glow), transparent 55%),
    var(--page-background);
}

/* 顶部标题栏固定高度，标题居中；状态标签通过绝对定位放在右侧。 */
.screen-header {
  position: relative;
  display: flex;
  min-height: 62px;
  flex: 0 0 62px;
  align-items: center;
  justify-content: center;
  padding: 0 4px 8px;
  border-bottom: 1px solid var(--header-border-color);
}

/* 标题组单独居中，避免右侧状态标签影响标题的视觉中心。 */
.screen-heading {
  text-align: center;
}

/* 标题和主题切换按钮同排，整体仍以标题栏中心对齐。 */
.heading-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

/* 主题图标使用轻量描边样式，与标题保持一致的视觉层级。 */
.theme-button {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  padding: 5px;
  border: 1px solid var(--control-border);
  border-radius: 50%;
  background: var(--control-background);
  color: var(--control-text);
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.theme-button svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.theme-button:hover {
  border-color: var(--accent-color);
  background: var(--control-hover-background);
  color: var(--heading-text);
}

.theme-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

/* 英文眉题作为主标题上方的辅助装饰文字。 */
.screen-eyebrow {
  margin: 0 0 3px;
  color: var(--accent-color);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

/* 主标题字号在不同屏幕宽度之间平滑缩放，并限制最大、最小值。 */
.screen-header h1 {
  margin: 0;
  color: var(--heading-text);
  font-size: clamp(19px, 1.8vw, 27px);
  font-weight: 600;
  letter-spacing: 0.08em;
}

/* 实时状态胶囊固定在标题栏右侧，并保持文字不换行。 */
.screen-status {
  position: absolute;
  top: 50%;
  right: 4px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 13px;
  border: 1px solid var(--status-border);
  border-radius: 20px;
  background: var(--status-background);
  color: var(--muted-text);
  font-size: 12px;
  transform: translateY(-50%);
  white-space: nowrap;
}

/* 状态圆点用绿色和外发光表示数据看板处于实时状态。 */
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--status-dot);
  box-shadow: 0 0 10px var(--status-glow);
}

/* 桌面端采用三列两行网格，中间列留宽给地图，首行略高于次行。 */
.dashboard-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.32fr) minmax(0, 0.92fr);
  grid-template-rows: minmax(0, 1.08fr) minmax(0, 0.82fr);
  grid-template-areas:
    "trend map hot"
    "seller rank stock";
  gap: 14px;
}

/* 使用命名网格区域明确安排六个图表的位置。 */
.panel-trend {
  grid-area: trend;
}

.panel-map {
  grid-area: map;
  /* 地图与周围面板留少量间距，让中间区域更突出。 */
  margin: 5px 3px 0;
}

.panel-hot {
  grid-area: hot;
}

.panel-seller {
  grid-area: seller;
}

.panel-rank {
  grid-area: rank;
}

.panel-stock {
  grid-area: stock;
}

/* 图表卡片提供统一的圆角边框、深色渐变底色与轻微阴影。 */
.dashboard-panel {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--panel-background);
  box-shadow: var(--panel-shadow);
}

/* 面板右上角的全屏开关；较高层级保证按钮可点击，半透明背景减少对图表的遮挡。 */
.fullscreen-button {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--control-border);
  border-radius: 7px;
  background: var(--control-background);
  color: var(--control-text);
  font-size: 19px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.fullscreen-button:hover {
  border-color: var(--accent-color);
  background: var(--control-hover-background);
}

.fullscreen-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

/* 原生全屏时让卡片占满视口并移除圆角；类名选择器作为全屏伪类的兼容补充。 */
.dashboard-panel:fullscreen,
.dashboard-panel.is-fullscreen {
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  z-index: 1000;
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  margin: 0;
  border-radius: 0;
  background: var(--page-background);
}

.dashboard-panel:fullscreen .panel-content,
.dashboard-panel.is-fullscreen .panel-content {
  width: 100%;
  height: 100%;
}

/* 内容区域填满卡片剩余空间，并裁切超出面板的图表内容。 */
.panel-content {
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

/* 让嵌套的页面和图表容器继承卡片尺寸，供 ECharts 正确计算画布。 */
.panel-content ::v-deep .page-container,
.panel-content ::v-deep .com-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* 平板布局：改成两列，地图占据首行，其他图表依次排列并允许页面滚动。 */
@media (max-width: 900px) {
  .screen-page {
    gap: 12px;
    padding: 14px;
    overflow: auto;
  }

  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: minmax(380px, 1.1fr) repeat(2, minmax(300px, 0.9fr)) minmax(300px, 0.9fr);
    grid-template-areas:
      "map map"
      "trend hot"
      "seller rank"
      "stock stock";
    flex: none;
  }
}

/* 手机布局：切换单列堆叠，隐藏右上角状态标签以免挤压标题。 */
@media (max-width: 560px) {
  .screen-page {
    padding: 12px;
  }

  .screen-header {
    min-height: 58px;
    flex-basis: 58px;
    justify-content: flex-start;
  }

  .screen-heading {
    text-align: left;
  }

  .heading-title-row {
    justify-content: flex-start;
  }

  .screen-header h1 {
    font-size: 18px;
  }

  .screen-eyebrow {
    font-size: 8px;
  }

  .screen-status {
    display: none;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: repeat(6, minmax(300px, 1fr));
    grid-template-areas:
      "map"
      "trend"
      "hot"
      "seller"
      "rank"
      "stock";
  }

  .panel-map {
    margin: 0;
  }
}
</style>