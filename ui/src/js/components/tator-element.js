export const svgNamespace = "http://www.w3.org/2000/svg";

let cachedSheets = null;

function getStyleSheets() {
  if (cachedSheets) return cachedSheets;

  const sheets = [];
  const styles = window.top.document.styleSheets;

  try {
    for (const styleSheet of styles) {
      if (!styleSheet.cssRules) continue;
      const cssText = Array.from(styleSheet.cssRules)
        .map(rule => {
          if (rule.type === CSSRule.IMPORT_RULE && rule.styleSheet) {
            // Handle @import rules
            return Array.from(rule.styleSheet.cssRules)
              .map(importedRule => importedRule.cssText)
              .join('\n');
          }
          return rule.cssText;
        })
        .join('\n');

      if (cssText) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        sheets.push(sheet);
      }
    }
  } catch (e) {
    console.warn('Failed to access stylesheets:', e);
  }

  cachedSheets = sheets;
  return sheets;
}

export class TatorElement extends HTMLElement {

  constructor() {
    super();
    if (document.NO_SHADOW_DOM) {
      this._shadow = document.createElement('div');
    } else {
      this._shadow = this.attachShadow({ mode: 'open' });
      this._shadow.adoptedStyleSheets = getStyleSheets();
    }
  }

  connectedCallback() {
    if (document.NO_SHADOW_DOM) {
      this.appendChild(this._shadow);
    }

    // Use this in derived classes
    this._onConnected();
  }

  _onConnected() {
  }
}
