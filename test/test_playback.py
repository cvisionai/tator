from ._common import print_page_error

import os
import cv2
import tempfile
import time
import pytesseract
import numpy as np
from pprint import pprint

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

def _wait_for_color(canvas, color_idx, timeout=30):
  for _ in range(timeout):
    canvas_color = _get_canvas_color(canvas)
    if np.argmax(canvas_color) == color_idx:
      break
    time.sleep(1)
  assert np.argmax(canvas_color) == color_idx, f"canvas_color={canvas_color}, looking for {color_idx}"

def _wait_for_frame(canvas, frame, timeout=30):
  for _ in range(timeout):
    canvas_frame = _get_canvas_frame(canvas)
    if canvas_frame == frame:
      break
    time.sleep(1)
  assert np.argmax(canvas_frame) == frame, f"canvas={canvas_frame}, expected={frame}"

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

  _wait_for_frame(canvas, 0)
  canvas_frame = _get_canvas_frame(canvas)
  assert(canvas_frame == 0)
  assert(int(display_div.inner_text())==0)

  play_button.click() # play the video
  time.sleep(5) # This is simulating the user watching, not dependent on any events.
  play_button.click() # pause the video
  canvas_frame = _get_canvas_frame(canvas)
  assert(canvas_frame > 0)
  assert(int(display_div.inner_text())==canvas_frame)

  # Click the scrub handle
  seek_x,seek_y = _get_element_center(seek_handle)
  page.mouse.move(seek_x, seek_y, steps=50)
  page.mouse.down()

  page.mouse.move(seek_x+500, seek_y, steps=50)
  canvas_frame = _get_canvas_frame(canvas)
  assert(int(display_div.inner_text())==canvas_frame)



def test_small_res_file(authenticated, project, small_video):
  # Tests play, scrub, and seek buffer usage
  print("[Video] Going to annotation view...")
  page = authenticated.new_page()
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{small_video}")
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  play_button = page.query_selector('play-button')
  seek_handle = page.query_selector('seek-bar .range-handle')

  # Wait for hq buffer and verify it is blue
  _wait_for_color(canvas, 2, timeout=30)

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

  
  # Wait for hq buffer and verify it is red
  _wait_for_color(canvas, 0, timeout=30)

  play_button.click()
  _wait_for_color(canvas, 1, timeout=30)

  # Pause the video
  play_button.click()
  _wait_for_color(canvas, 0, timeout=30)
  

  # Click the scrub handle
  seek_x,seek_y = _get_element_center(seek_handle)
  page.mouse.move(seek_x, seek_y, steps=50)
  page.mouse.down()

  page.mouse.move(seek_x+500, seek_y, steps=50)
  _wait_for_color(canvas, 1, timeout=30)

  page.mouse.move(seek_x+1000, seek_y, steps=50)
  _wait_for_color(canvas, 2, timeout=30)

  # Release the scrub
  page.mouse.up()
  _wait_for_color(canvas, 0, timeout=30)

"""
This test would be good, but doesn't work because playback isn't performant enough in test runner

def test_audiosync(authenticated, project, slow_video):
  # Tests audio sync as reported by watchdog thread
  # TODO: Consider a longer video than the audio video sync test
  # NOTE: This uses a 5fps video because playback was kind of lousy in the test runner
  print("[Video] Going to annotation view...")
  page = authenticated.new_page()
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{slow_video}?scrubQuality=360&seekQuality=1080&playQuality=720")
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  play_button = page.query_selector('play-button')

  # wait for video to be ready - TODO make this better?
  time.sleep(10)

  console_msgs=[]
  page.on("console", lambda msg: console_msgs.append(msg.text))
  play_button.click()
  time.sleep(8)
  play_button.click()
  audio_sync_msgs=[m for m in console_msgs if m.find("Audio drift") > 0]
  audio_sync_values=[]
  pprint(console_msgs)
  for msg in audio_sync_msgs:
    comps = msg.split(',')
    audio_drift = comps[4].split('=')[1]
    audio_drift = float(audio_drift.replace('ms','').strip())
    audio_sync_values.append(abs(audio_drift))
  print(f"Audio sync values = {audio_sync_values}")
  drift_array=np.array(audio_sync_values[1:])
  assert drift_array.mean() < 50, "Average drift should be less than 50"
"""






  







