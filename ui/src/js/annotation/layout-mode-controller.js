import { MouseMode } from "../../../../scripts/packages/tator-js/src/annotator/annotation.js";

export class LayoutModeController {
  constructor(player, sidebar, browser, header) {
    this.player = player;
    this.videoCanvas = player._video ? [player._video] : player._videos;
    this.canvas = player._video ? player._video : player._gridDiv.parentElement;
    this.sidebar = sidebar;
    this.browser = browser;
    this.header = header._shadow.querySelectorAll('header')[0];
    this.controls = this.player._controls_and_scrub;
    this.warningLight = header._shadow.querySelectorAll('warning-light')[0];
    this.successLight = header._shadow.querySelectorAll('success-light')[0];
    this.preview = this.player._preview._shadow.querySelectorAll('.tooltip-seek-preview')[0];
    this.fullscreen = this.player._shadow.querySelectorAll('video-fullscreen')[0];
    this.fullscreen.addEventListener('click', this.toggleFullscreen.bind(this));
    this.allControls = [
      this.controls,
      this.sidebar,
      this.browser,
      this.header,
    ];
    this.showModes = [MouseMode.QUERY, MouseMode.SELECT];
    this.keepHidden = false;
    // Control visibility based on mouse movement
    document.addEventListener('mousemove', (event) => {
      if (window.MODE != 'FULLSCREEN' || this.keepHidden) {
        return;
      }
      if (!this.shouldShowControls()) {
        this.hideControls(true);
        return;
      }
      const mouseX = event.pageX;
      const mouseY = event.pageY;
      const control = this.getControlUnderMouse(mouseX, mouseY);
      if (control) {
        this.activateControl(control);
      } else {
        this.showControls();
      }
    });

    // Hide controls on click outside controls
    document.addEventListener('click', (event) => {
      if (window.MODE != 'FULLSCREEN' || !this.shouldShowControls()) {
        return;
      }
      clearTimeout(this.hideTimeout);
      clearTimeout(this.inactivityTimeout);
      const mouseX = event.pageX;
      const mouseY = event.pageY;
      const control = this.getControlUnderMouse(mouseX, mouseY);
      if (!control) {
        this.hideControls();
      }
    });

    // If this is a multi, handle window resizes here
    if (this.canvas.tagName == 'DIV') {
      this.canvas.style.width = '100%';
      this.videoCanvas.forEach(canvas => canvas._stretch = 1);
      /*
      window.addEventListener('resize', () => {
        if (window.MODE == 'FULLSCREEN') {
          const ratio = this.canvas.width / this.canvas.height;
          if (window.innerHeight * ratio < window.innerWidth) {
            this.canvas.style.height = window.innerHeight;
            this.canvas.style.width = window.innerHeight * ratio;
          } else {
            this.canvas.style.height = window.innerWidth / ratio;
            this.canvas.style.width = window.innerWidth;
          }
        }
      });
      */
    }
  }

  shouldShowControls() {
    const modeOkay = this.videoCanvas.every(canvas => this.showModes.includes(canvas._mouseMode));
    const lightsVisible = this.warningLight.style.opacity > 0 || this.successLight.style.opacity > 0;
    const saveDialogs = Object.values(this.player.parent._saves);
    const saveDialogVisible = saveDialogs.some(dlg => dlg.classList.contains("is-open"));
    return modeOkay && !lightsVisible && !saveDialogVisible;
  }

  activateControl(control) {
    clearTimeout(this.hideTimeout);
    clearTimeout(this.inactivityTimeout);
    this.allControls.forEach((c) => {
      if (c === control) {
        c.style.opacity = 1;
      } else {
        c.style.opacity = 0;
      }
    });
  }

  showControls() {
    clearTimeout(this.hideTimeout);
    clearTimeout(this.inactivityTimeout);
    this.allControls.forEach((control) => {
      control.style.display = 'block';
      control.style.opacity = 0.5;
    });
    this.startInactivityTimer();
  }

  hideControls(realHide = false) {
    this.allControls.forEach((control) => {
      control.style.opacity = 0;
    });
    if (realHide) {
      this.hideTimeout = setTimeout(() => {
        this.allControls.forEach((control) => {
          control.style.display = 'none';
        });
      }, 500 + 50);
    }
    this.keepHidden = true;
    setTimeout(() => {
      this.keepHidden = false;
    }, 200);
  }

  startInactivityTimer() {
    this.inactivityTimeout = setTimeout(() => {
      this.hideControls();
    }, 1000);
  }

  getControlUnderMouse(x, y) {
    return this.allControls.find(control => {
      const rect = control.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });
  }

  toggleFullscreen() {
    this.player._hideCanvasMenus();
    if (this.fullscreen.hasAttribute("is-maximized")) {
      clearTimeout(this.hideTimeout);
      clearTimeout(this.inactivityTimeout);
      window.MODE = undefined;
      this.canvas.setAttribute('style', this.styles.canvas);
      this.controls.setAttribute('style', this.styles.controls);
      this.sidebar.setAttribute('style', this.styles.sidebar);
      this.browser.setAttribute('style', this.styles.browser);
      this.header.setAttribute('style', this.styles.header);
      this.successLight._svg.setAttribute('style', this.styles.successLightSvg);
      this.successLight._message_div.setAttribute('style', this.styles.successLightDiv);
      this.parents.successLight.appendChild(this.successLight);
      this.warningLight._svg.setAttribute('style', this.styles.warningLightSvg);
      this.warningLight._message_div.setAttribute('style', this.styles.warningLightDiv);
      this.parents.warningLight.appendChild(this.warningLight);
      this.preview.setAttribute('style', this.styles.preview);
      this.fullscreen.removeAttribute("is-maximized");
    } else {
      window.MODE = 'FULLSCREEN';
      // Save off styles so we can restore them later
      this.styles = {
        canvas: this.canvas.getAttribute('style'),
        controls: this.controls.getAttribute('style'),
        sidebar: this.sidebar.getAttribute('style'),
        browser: this.browser.getAttribute('style'),
        header: this.header.getAttribute('style'),
        successLightSvg: this.successLight._svg.getAttribute('style'),
        successLightDiv: this.successLight._message_div.getAttribute('style'),
        warningLightSvg: this.warningLight._svg.getAttribute('style'),
        warningLightDiv: this.warningLight._message_div.getAttribute('style'),
        preview: this.preview.getAttribute('style'),
      };
      this.parents = {
        successLight: this.successLight.parentElement,
        warningLight: this.warningLight.parentElement,
      };
      // Make player full screen
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '50%';
      this.canvas.style.left = '50%';
      this.canvas.style.transform = 'translate(-50%, -50%)';
      this.videoCanvas.forEach(canvas => canvas._canvas.style.maxHeight = null);
      this.videoCanvas.forEach(canvas => canvas.parentNode.style.maxWidth = null);
      // Move controls to bottom of screen
      this.controls.style.position = 'fixed';
      this.controls.style.bottom = 0;
      this.controls.style.left = 0;
      this.controls.style.zIndex = 4;
      this.controls.style.width = '100%';
      this.controls.style.margin = 0;
      this.controls.style.padding = 10;
      this.controls.style.boxSizing = 'border-box';
      this.controls.style.transition = 'opacity 0.5s ease';
      // Move sidebar to left of screen
      this.sidebar.style.position = 'fixed';
      this.sidebar.style.top = "72";
      this.sidebar.style.left = 0;
      this.sidebar.style.zIndex = 4;
      this.sidebar.style.transition = 'opacity 0.5s ease';
      // Move browser to right of screen
      this.browser.style.position = 'fixed';
      this.browser.style.top = "72";
      this.browser.style.right = 0;
      this.browser.style.zIndex = 4;
      this.browser.style.transition = 'opacity 0.5s ease';
      // Set up header
      this.header.style.position = 'fixed';
      this.header.style.top = 0;
      this.header.style.left = 0;
      this.header.style.zIndex = 4;
      this.header.style.transition = 'opacity 0.5s ease';
      // Set up warning light
      document.body.appendChild(this.warningLight);
      this.warningLight._svg.style.position = "fixed";
      this.warningLight._svg.style.top = "10px";
      this.warningLight._svg.style.right = "310px";
      this.warningLight._message_div.style.position = "fixed";
      this.warningLight._message_div.style.top = "10px";
      this.warningLight._message_div.style.right = "10px";
      this.warningLight._message_div.style.width = "300px";
      // Set up success light
      document.body.appendChild(this.successLight);
      this.successLight._svg.style.position = "fixed";
      this.successLight._svg.style.top = "10px";
      this.successLight._svg.style.right = "310px";
      this.successLight._message_div.style.position = "fixed";
      this.successLight._message_div.style.top = "10px";
      this.successLight._message_div.style.right = "10px";
      this.successLight._message_div.style.width = "300px";
      // Set up preview
      this.preview.style.position = 'fixed';

      // Hide video controls
      this.hideControls();

      this.fullscreen.setAttribute("is-maximized", "");
    }
    window.dispatchEvent(new Event('resize'));
  }
    
}
