// DeLab Shadow DOM 封装 - 样式隔离

export class ShadowHost {
  private host: HTMLElement;
  private shadowRoot: ShadowRoot;

  constructor() {
    // 创建宿主元素
    this.host = document.createElement('div');
    this.host.id = 'delab-root';
    this.host.style.cssText = 'all: initial; position: static;';
    document.body.appendChild(this.host);

    // 创建 Shadow DOM
    this.shadowRoot = this.host.attachShadow({ mode: 'open' });

    // 注入基础样式重置
    this.injectBaseStyles();
  }

  private injectBaseStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        display: block;
        position: static;
      }

      * {
        box-sizing: border-box;
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  getRoot(): ShadowRoot {
    return this.shadowRoot;
  }

  setThemeVariables(variables: Record<string, string>) {
    for (const [key, value] of Object.entries(variables)) {
      this.host.style.setProperty(key, value);
    }
    // 同时设置到 shadow root 内部
    const style = this.shadowRoot.querySelector('style');
    if (style) {
      let vars = '';
      for (const [key, value] of Object.entries(variables)) {
        vars += `${key}: ${value};\n`;
      }
      // 更新 CSS 变量
      style.textContent = style.textContent!.replace(
        /--delab-[\w-]+:.*;/g,
        ''
      ) + `
      :root {
        ${vars}
      }
      `;
    }
  }

  destroy() {
    this.host.remove();
  }
}
