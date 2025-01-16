export class LayoutModeController {
  constructor(player, sidebar, browser, header) {
    this.player = player;
    this.videoCanvas = this.player._video;
    this.sidebar = sidebar;
    this.browser = browser;
    this.header = header;
    this.controls = this.player._controls_and_scrub;
    const fullscreenButton = this.player._shadow.querySelectorAll('video-fullscreen')[0];
    fullscreenButton.addEventListener('click', this.setFullscreen.bind(this));
  }

  setFullscreen() {
    window.MODE = 'FULLSCREEN';
    // Make player full screen
    this.videoCanvas.style.position = 'fixed';
    this.videoCanvas.style.top = '50%';
    this.videoCanvas.style.left = '50%';
    this.videoCanvas.style.transform = 'translate(-50%, -50%)';
    this.videoCanvas._stretch = 1;
    this.videoCanvas._canvas.style.maxHeight = null;
    /*
    this.videoCanvas.style.alignItems = 'center';
    this.videoCanvas.style.justifyContent = 'center';
    this.videoCanvas.style.inset = 0;
    this.videoCanvas.style.display = 'flex';
    this.videoCanvas.style.width = null;
    this.videoCanvas.style.maxHeight = '100%';
    this.videoCanvas.style.maxWidth = '100%';
    */
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
    // this.header.style.display = 'none';
    window.dispatchEvent(new Event('resize'));
  }
    
}
