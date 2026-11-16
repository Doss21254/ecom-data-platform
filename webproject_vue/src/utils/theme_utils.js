const themeConfigs = {
  hjh: {
    variables: {
      '--page-background': '#07111f',
      '--page-glow': 'rgba(32, 99, 150, 0.3)',
      '--primary-text': '#e8f1ff',
      '--heading-text': '#f2f7ff',
      '--muted-text': '#b7cde0',
      '--accent-color': '#65b9dc',
      '--border-color': 'rgba(88, 140, 180, 0.25)',
      '--header-border-color': 'rgba(88, 140, 180, 0.22)',
      '--panel-background': 'linear-gradient(145deg, rgba(14, 31, 49, 0.96), rgba(9, 22, 37, 0.96))',
      '--panel-shadow': '0 10px 28px rgba(0, 0, 0, 0.22), inset 0 1px rgba(190, 225, 255, 0.04)',
      '--control-background': 'rgba(8, 24, 40, 0.88)',
      '--control-border': 'rgba(133, 179, 216, 0.45)',
      '--control-text': '#d8eaff',
      '--control-hover-background': 'rgba(34, 86, 119, 0.95)',
      '--status-background': 'rgba(15, 42, 62, 0.72)',
      '--status-border': 'rgba(95, 190, 218, 0.24)',
      '--status-dot': '#4dd4ac',
      '--status-glow': 'rgba(77, 212, 172, 0.8)'
    },
    chart: {
      text: '#e8f1ff',
      mutedText: '#b7cde0',
      gridLine: 'rgba(183, 205, 224, 0.2)',
      tooltipBackground: 'rgba(9, 22, 37, 0.96)',
      tooltipBorder: 'rgba(133, 179, 216, 0.45)',
      mapLand: '#263b5a',
      mapBorder: '#7fa9d8',
      mapEmphasis: '#4e86bd',
      mapLabel: '#ffffff',
      stockEmpty: '#333843',
      stockLabels: ['#1890ff', '#2fc25b', '#fadb14', '#f04864', '#8543e0']
    }
  },
  vintage: {
    variables: {
      '--page-background': '#f5efe5',
      '--page-glow': 'rgba(192, 139, 92, 0.2)',
      '--primary-text': '#493d32',
      '--heading-text': '#3c332a',
      '--muted-text': '#75685b',
      '--accent-color': '#9c6251',
      '--border-color': 'rgba(144, 110, 79, 0.3)',
      '--header-border-color': 'rgba(144, 110, 79, 0.28)',
      '--panel-background': 'linear-gradient(145deg, rgba(255, 253, 248, 0.98), rgba(241, 232, 216, 0.98))',
      '--panel-shadow': '0 10px 28px rgba(91, 67, 45, 0.12), inset 0 1px rgba(255, 255, 255, 0.8)',
      '--control-background': 'rgba(255, 251, 244, 0.94)',
      '--control-border': 'rgba(144, 110, 79, 0.42)',
      '--control-text': '#564639',
      '--control-hover-background': 'rgba(234, 217, 197, 0.98)',
      '--status-background': 'rgba(255, 251, 244, 0.82)',
      '--status-border': 'rgba(144, 110, 79, 0.3)',
      '--status-dot': '#668b62',
      '--status-glow': 'rgba(102, 139, 98, 0.4)'
    },
    chart: {
      text: '#493d32',
      mutedText: '#75685b',
      gridLine: 'rgba(117, 104, 91, 0.22)',
      tooltipBackground: 'rgba(255, 251, 244, 0.98)',
      tooltipBorder: 'rgba(144, 110, 79, 0.42)',
      mapLand: '#d9c8a9',
      mapBorder: '#a98568',
      mapEmphasis: '#b88365',
      mapLabel: '#382f27',
      stockEmpty: '#e4dac9',
      stockLabels: ['#397bb5', '#648e63', '#c09434', '#bf665b', '#8669a5']
    }
  }
}

export function getThemeConfig(themeName) {
  return themeConfigs[themeName] || themeConfigs.hjh
}

// Shared theme defaults stay axis-free; pie and map charts should not inherit Cartesian axes.
export function getChartBaseOption(chartColors) {
  const baseOption = {
    backgroundColor: 'transparent',
    textStyle: {
      color: chartColors.text
    },
    title: {
      textStyle: {
        color: chartColors.text
      }
    },
    legend: {
      textStyle: {
        color: chartColors.mutedText
      }
    },
    tooltip: {
      backgroundColor: chartColors.tooltipBackground,
      borderColor: chartColors.tooltipBorder,
      textStyle: {
        color: chartColors.text
      }
    }
  }

  return baseOption
}

// Cartesian charts opt in to axis colors; this keeps pie charts free of unused axes.
export function getCartesianChartBaseOption(chartColors) {
  return {
    ...getChartBaseOption(chartColors),
    xAxis: {
      axisLabel: {
        color: chartColors.mutedText
      },
      axisLine: {
        lineStyle: {
          color: chartColors.gridLine
        }
      },
      splitLine: {
        lineStyle: {
          color: chartColors.gridLine
        }
      }
    },
    yAxis: {
      axisLabel: {
        color: chartColors.mutedText
      },
      axisLine: {
        lineStyle: {
          color: chartColors.gridLine
        }
      },
      splitLine: {
        lineStyle: {
          color: chartColors.gridLine
        }
      }
    }
  }
}
