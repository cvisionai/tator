from ._common import print_page_error

import os
import cv2
import tempfile
import time
import pytesseract
import numpy as np

def _get_canvas_color(canvas):
  """ Returns the RGB value of the canvas (mean) """
  with tempfile.TemporaryDirectory() as td:
    canvas.screenshot(path=os.path.join(td, "canvas.png"))
    img=cv2.imread(os.path.join(td, "canvas.png"))
    img=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
    return img.mean(axis=(0,1))

def _get_canvas_frame(canvas):
  """ Returns the frame number reported by the video """
  with tempfile.TemporaryDirectory() as td:
    canvas.screenshot(path=os.path.join(td, "canvas.png"))
    img=cv2.imread(os.path.join(td, "canvas.png"))
    img=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
    text = pytesseract.image_to_string(img)
    _,val=text.strip().split('=')
    return int(val)

def _get_element_center(element):
  box = element.bounding_box()
  center_x = box['x'] + box['width'] / 2
  center_y = box['y'] + box['height'] / 2
  return center_x,center_y

def test_playback_accuracy(authenticated, project, count_test):
  print("[Video] Going to annotation view...")
  page = authenticated.new_page()
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{count_test}?scrubQuality=360&seekQuality=720&playQuality=720")
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  play_button = page.query_selector('play-button')
  seek_handle = page.query_selector('seek-bar .range-handle')
  display_div = page.query_selector('#frame_num_display')
  time.sleep(5)
  canvas_frame = _get_canvas_frame(canvas)
  assert(canvas_frame == 0)
  assert(int(display_div.inner_text())==0)

  play_button.click()
  time.sleep(5)
  play_button.click()
  canvas_frame = _get_canvas_frame(canvas)
  assert(canvas_frame > 0)
  assert(int(display_div.inner_text())==canvas_frame)
  
def test_buffer_usage(authenticated, project, rgb_test):
  # Tests play, scrub, and seek buffer usage
  print("[Video] Going to annotation view...")
  page = authenticated.new_page()
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{rgb_test}?scrubQuality=360&seekQuality=1080&playQuality=720")
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  play_button = page.query_selector('play-button')
  seek_handle = page.query_selector('seek-bar .range-handle')

  canvas_color = None
  # Wait for hq buffer and verify it is red
  for _ in range(30):
    canvas_color = _get_canvas_color(canvas)
    if np.argmax(canvas_color) == 0:
      break
    time.sleep(1)
  assert np.argmax(canvas_color) == 0, f"{canvas_color}"

  play_button.click()
  for _ in range(30):
    canvas_color = _get_canvas_color(canvas)
    if np.argmax(canvas_color) == 1:
      break
    time.sleep(1)
  assert np.argmax(canvas_color) == 1, f"{canvas_color}"

  # Pause the video
  play_button.click()
  for _ in range(30):
    canvas_color = _get_canvas_color(canvas)
    if np.argmax(canvas_color) == 0:
      break
    time.sleep(1)
  assert np.argmax(canvas_color) == 0, f"{canvas_color}"
  

  # Click the scrub handle
  seek_x,seek_y = _get_element_center(seek_handle)
  page.mouse.move(seek_x, seek_y, steps=50)
  page.mouse.down()

  page.mouse.move(seek_x+500, seek_y, steps=50)
  print("Checking for GREEN")
  canvas_color = _get_canvas_color(canvas)
  print(f"GOT={canvas_color}")
  assert np.argmax(canvas_color) == 1, f"{canvas_color}"

  page.mouse.move(seek_x+1000, seek_y, steps=50)
  print("Checking for BLUE")
  canvas_color = _get_canvas_color(canvas)
  print(f"GOT={canvas_color}")
  assert np.argmax(canvas_color) == 2, f"{canvas_color}"

  # Release the scrub
  page.mouse.up()
  for _ in range(30):
    canvas_color = _get_canvas_color(canvas)
    if np.argmax(canvas_color) == 0:
      break
    time.sleep(1)
  assert np.argmax(canvas_color) == 0, f"{canvas_color}"







