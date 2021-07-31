import os

class ScreenshotSaver:
    def __init__(self, browser, directory):
        self._dir = directory
        self._browser = browser
        self._count = 0

    def save_screenshot(self, description):
        fname = f"{self._count:02d}_{description.lower().replace(' ', '_')}.png"
        out = os.path.join(self._dir, fname)
        self._browser.save_screenshot(out)
        self._count += 1
        
