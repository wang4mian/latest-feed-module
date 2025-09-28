// 样式预设管理器
export interface StylePreset {
  name: string;
  description: string;
  category: string;
  config: any;
}

// 预设样式配置列表
export const STYLE_PRESETS: StylePreset[] = [
  {
    name: "KUATO 默认样式",
    description: "KUATO平台默认的文章样式配置",
    category: "default",
    config: {} // 将在运行时加载
  },
  {
    name: "商用机器人拆解局样式",
    description: "适合制造业分析文章的专业样式配置",
    category: "manufacturing",
    config: {} // 将在运行时加载
  },
  {
    name: "微信公众号样式",
    description: "专为微信公众号优化的文章样式",
    category: "wechat",
    config: {} // 将在运行时加载
  }
];

// 预设文件映射
export const PRESET_FILES = {
  'kuato-default': '/src/styles/presets/kuato-default.json',
  'commercial-robot-breakdown': '/src/styles/presets/commercial-robot-breakdown.json',
  'wechat-official': '/src/styles/presets/wechat-official.json'
};

// 样式预设ID映射
export const PRESET_ID_MAP = {
  "KUATO 默认样式": "kuato-default",
  "商用机器人拆解局样式": "commercial-robot-breakdown",
  "微信公众号样式": "wechat-official"
};

// 加载预设样式配置
export async function loadStylePreset(presetId: string): Promise<StylePreset | null> {
  try {
    const filePath = PRESET_FILES[presetId as keyof typeof PRESET_FILES];
    if (!filePath) {
      console.error('未找到预设配置文件:', presetId);
      return null;
    }

    // 在浏览器环境中使用 fetch 加载配置文件
    const response = await fetch(filePath);
    if (!response.ok) {
      console.error('加载预设配置失败:', response.status);
      return null;
    }

    const presetData = await response.json();
    return presetData;
  } catch (error) {
    console.error('解析预设配置失败:', error);
    return null;
  }
}

// 获取所有可用的预设样式
export function getAvailablePresets(): Array<{id: string, name: string, description: string, category: string}> {
  return Object.entries(PRESET_ID_MAP).map(([name, id]) => {
    const preset = STYLE_PRESETS.find(p => p.name === name);
    return {
      id,
      name,
      description: preset?.description || '',
      category: preset?.category || 'default'
    };
  });
}

// 样式分类
export const STYLE_CATEGORIES = {
  'default': '🎨 默认样式',
  'manufacturing': '🏭 制造业',
  'wechat': '📱 微信公众号',
  'academic': '📚 学术论文',
  'business': '💼 商业报告'
};

// 获取分类显示名称
export function getCategoryDisplayName(category: string): string {
  return STYLE_CATEGORIES[category as keyof typeof STYLE_CATEGORIES] || category;
}