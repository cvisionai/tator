export class LayoutModeController {
  constructor(player, sidebar, browser, header) {
    this.player = player;
    this.videoCanvas = this.player._video;
    this.sidebar = sidebar;
    this.browser = browser;
    this.header = header;
    this.controls = this.player._controls_and_scrub;
    this.fullscreen = this.player._shadow.querySelectorAll('video-fullscreen')[0];
    this.fullscreen.addEventListener('click', this.toggleFullscreen.bind(this));
  }

  toggleFullscreen() {
    this.player._hideCanvasMenus();
    if (this.fullscreen.hasAttribute("is-maximized")) {
      window.MODE = undefined;
      this.videoCanvas.setAttribute('style', this.styles.videoCanvas);
      this.controls.setAttribute('style', this.styles.controls);
      this.sidebar.setAttribute('style', this.styles.sidebar);
      this.browser.setAttribute('style', this.styles.browser);
      this.fullscreen.removeAttribute("is-maximized");
    } else {
      window.MODE = 'FULLSCREEN';
      // Save off styles so we can restore them later
      this.styles = {
        videoCanvas: this.videoCanvas.getAttribute('style'),
        controls: this.controls.getAttribute('style'),
        sidebar: this.sidebar.getAttribute('style'),
        browser: this.browser.getAttribute('style'),
      };
      // Make player full screen
      this.videoCanvas.style.position = 'fixed';
      this.videoCanvas.style.top = '50%';
      this.videoCanvas.style.left = '50%';
      this.videoCanvas.style.transform = 'translate(-50%, -50%)';
      this.videoCanvas._canvas.style.maxHeight = null;
      // Move controls to bottom of screen
      this.controls.style.position = 'fixed';
      this.controls.style.bottom = 0;
      this.controls.style.left = 0;
      this.controls.style.zIndex = 4;
      this.controls.style.width = '100%';
      this.controls.style.margin = 0;
      this.controls.style.padding = 10;
      this.controls.style.boxSizing = 'border-box';
      // Move sidebar to left of screen
      this.sidebar.style.position = 'fixed';
      this.sidebar.style.top = "72";
      this.sidebar.style.left = 0;
      this.sidebar.style.zIndex = 4;
      // Move browser to right of screen
      this.browser.style.position = 'fixed';
      this.browser.style.top = "72";
      this.browser.style.right = 0;
      this.browser.style.zIndex = 4;
      // Hide video controls
      this.fullscreen.setAttribute("is-maximized", "");
    }
    window.dispatchEvent(new Event('resize'));
  }
    
}
