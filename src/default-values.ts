// DeLab 默认值过滤引擎 - 常见浏览器 UA 默认样式字典

// 按 HTML 元素标签名 + 属性名，存储浏览器默认值
// 涵盖最常见 HTML 元素的默认 computed style 值
const DEFAULT_VALUES: Record<string, Record<string, string>> = {
  // 通用默认值
  '*': {
    'display': '',
    'position': 'static',
    'opacity': '1',
    'cursor': 'auto',
    'overflow': 'visible',
    'box-shadow': 'none',
    'text-shadow': 'none',
    'background-color': 'rgba(0, 0, 0, 0)',
    'background-image': 'none',
    'background-size': 'auto',
    'color': 'rgb(0, 0, 0)',
    'font-weight': '400',
    'font-style': 'normal',
    'text-align': 'start',
    'line-height': 'normal',
    'letter-spacing': 'normal',
    'margin-top': '0px',
    'margin-right': '0px',
    'margin-bottom': '0px',
    'margin-left': '0px',
    'padding-top': '0px',
    'padding-right': '0px',
    'padding-bottom': '0px',
    'padding-left': '0px',
    'border-top-width': '0px',
    'border-right-width': '0px',
    'border-bottom-width': '0px',
    'border-left-width': '0px',
    'border-style': 'none',
    'border-color': 'rgb(0, 0, 0)',
    'border-radius': '0px',
    'flex-direction': 'row',
    'justify-content': 'normal',
    'align-items': 'normal',
    'gap': 'normal',
    'width': 'auto',
    'height': 'auto',
    'max-width': 'none',
    'max-height': 'none',
  },
  'div': {
    'display': 'block',
  },
  'span': {
    'display': 'inline',
  },
  'p': {
    'display': 'block',
    'margin-top': '16px',
    'margin-bottom': '16px',
  },
  'a': {
    'display': 'inline',
    'color': 'rgb(0, 0, 238)',
    'cursor': 'pointer',
    'text-decoration': 'underline',
  },
  'h1': {
    'display': 'block',
    'font-size': '32px',
    'font-weight': '700',
    'margin-top': '21.44px',
    'margin-bottom': '21.44px',
  },
  'h2': {
    'display': 'block',
    'font-size': '24px',
    'font-weight': '700',
    'margin-top': '19.92px',
    'margin-bottom': '19.92px',
  },
  'h3': {
    'display': 'block',
    'font-size': '18.72px',
    'font-weight': '700',
    'margin-top': '18.72px',
    'margin-bottom': '18.72px',
  },
  'h4': {
    'display': 'block',
    'font-size': '16px',
    'font-weight': '700',
    'margin-top': '21.28px',
    'margin-bottom': '21.28px',
  },
  'h5': {
    'display': 'block',
    'font-size': '13.28px',
    'font-weight': '700',
    'margin-top': '22.1776px',
    'margin-bottom': '22.1776px',
  },
  'h6': {
    'display': 'block',
    'font-size': '10.72px',
    'font-weight': '700',
    'margin-top': '24.9776px',
    'margin-bottom': '24.9776px',
  },
  'ul': {
    'display': 'block',
    'margin-top': '16px',
    'margin-bottom': '16px',
    'padding-left': '40px',
  },
  'ol': {
    'display': 'block',
    'margin-top': '16px',
    'margin-bottom': '16px',
    'padding-left': '40px',
  },
  'li': {
    'display': 'list-item',
    'text-align': 'start',
  },
  'img': {
    'display': 'inline',
  },
  'input': {
    'display': 'inline-block',
    'font-family': 'Arial',
    'font-size': '13.3333px',
    'cursor': 'text',
    'border-color': 'rgb(118, 118, 118)',
    'padding-top': '1px',
    'padding-right': '1px',
    'padding-bottom': '1px',
    'padding-left': '1px',
    'border-top-width': '2px',
    'border-right-width': '2px',
    'border-bottom-width': '2px',
    'border-left-width': '2px',
    'border-style': 'inset',
    'background-color': 'rgb(255, 255, 255)',
  },
  'textarea': {
    'font-family': 'monospace',
    'font-size': '13.3333px',
    'cursor': 'text',
    'border-color': 'rgb(118, 118, 118)',
    'padding-top': '2px',
    'padding-right': '2px',
    'padding-bottom': '2px',
    'padding-left': '2px',
    'border-top-width': '2px',
    'border-right-width': '2px',
    'border-bottom-width': '2px',
    'border-left-width': '2px',
    'border-style': 'inset',
    'background-color': 'rgb(255, 255, 255)',
  },
  'button': {
    'display': 'inline-block',
    'font-family': 'Arial',
    'font-size': '13.3333px',
    'padding-top': '1px',
    'padding-right': '6px',
    'padding-bottom': '1px',
    'padding-left': '6px',
    'border-top-width': '2px',
    'border-right-width': '2px',
    'border-bottom-width': '2px',
    'border-left-width': '2px',
    'border-style': 'outset',
    'border-color': 'rgb(118, 118, 118)',
    'background-color': 'rgb(239, 239, 239)',
    'text-align': 'center',
  },
  'table': {
    'display': 'table',
    'border-collapse': 'separate',
    'border-spacing': '2px',
  },
  'td': {
    'display': 'table-cell',
  },
  'th': {
    'display': 'table-cell',
    'font-weight': '700',
    'text-align': 'center',
  },
  'tr': {
    'display': 'table-row',
  },
  'strong': {
    'font-weight': '700',
  },
  'b': {
    'font-weight': '700',
  },
  'em': {
    'font-style': 'italic',
  },
  'i': {
    'font-style': 'italic',
  },
  'u': {
    'text-decoration': 'underline',
  },
  'pre': {
    'display': 'block',
    'font-family': 'monospace',
    'white-space': 'pre',
    'margin-top': '16px',
    'margin-bottom': '16px',
  },
  'code': {
    'font-family': 'monospace',
  },
  'blockquote': {
    'display': 'block',
    'margin-top': '16px',
    'margin-bottom': '16px',
    'margin-left': '40px',
    'margin-right': '40px',
  },
  'hr': {
    'display': 'block',
    'margin-top': '8px',
    'margin-bottom': '8px',
    'border-top-width': '1px',
    'border-right-width': '0px',
    'border-bottom-width': '0px',
    'border-left-width': '0px',
    'border-style': 'inset',
    'border-color': 'rgb(128, 128, 128)',
  },
  'body': {
    'display': 'block',
    'margin-top': '8px',
    'margin-right': '8px',
    'margin-bottom': '8px',
    'margin-left': '8px',
  },
};

// 匹配默认值的容错范围（部分属性如 border-color 颜色可能细微差异）
const FUZZY_MATCHES: Record<string, string[]> = {
  'color': ['rgb(0, 0, 0)', 'rgb(0, 0, 0)', '#000000'],
  'background-color': ['rgba(0, 0, 0, 0)', 'transparent', 'rgb(255, 255, 255)'],
};

export function isDefaultValue(tagName: string, propName: string, value: string): boolean {
  // 先查标签特定默认值
  const tagDefaults = DEFAULT_VALUES[tagName];
  if (tagDefaults && propName in tagDefaults) {
    if (tagDefaults[propName] === value) return true;
  }

  // 再查通用默认值
  const globalDefaults = DEFAULT_VALUES['*'];
  if (propName in globalDefaults) {
    if (globalDefaults[propName] === value) return true;
  }

  // 模糊匹配
  if (FUZZY_MATCHES[propName]) {
    for (const fuzzy of FUZZY_MATCHES[propName]) {
      if (fuzzy === value) return true;
    }
  }

  return false;
}
