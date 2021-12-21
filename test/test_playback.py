from ._common import print_page_error

import os
import cv2
import tempfile
import time

def _get_canvas_color(canvas):
  """ Returns the RGB value of the canvas (mean) """
  with tempfile.TemporaryDirectory() as td:
    canvas.screenshot(path=os.path.join(td, "canvas.png"))
    img=cv2.imread(os.path.join(td, "canvas.png"))
    img=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
    return img.mean(axis=(0,1))

def test_buffer_usage(authenticated, project, rgb_test):
  # http://local.tator.io/46/annotation/7444
  print("[Video] Going to annotation view...")
  page = authenticated.new_page()
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{rgb_test}?scrubQuality=360&seekQuality=1080&playQuality=720")
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  play_button = page.query_selector('play-button')

  print("Checking for RED")
  # Wait for hq buffer and verify it is red
  time.sleep(5) # TODO make this better
  canvas_color = _get_canvas_color(canvas)
  print(f"GOT={canvas_color}")
  assert canvas_color[0] > 200
  assert canvas_color[1] < 40
  assert canvas_color[2] < 40

  play_button.click()
  time.sleep(5)
  print("Checking for GREEN")
  canvas_color = _get_canvas_color(canvas)
  print(f"GOT={canvas_color}")
  assert canvas_color[0] < 40
  assert canvas_color[1] > 200
  assert canvas_color[2] < 40

  play_button.click()




