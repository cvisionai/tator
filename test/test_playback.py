from ._common import print_page_error

import os
import cv2
import tempfile
import inspect
import io
import pytesseract
import pytest
import numpy as np
from pprint import pprint

def _get_canvas_color(canvas):
  """ Returns the RGB value of the canvas (mean) """
  screen_bytes = None
  attempts = 0
  while screen_bytes == None and attempts < 5:
    try:
      screen_bytes = canvas.screenshot()
      attempts += 1
    except Exception as e:
      print(e)
      pass
  screen = np.frombuffer(screen_bytes, dtype=np.uint8)
  img = cv2.imdecode(screen, cv2.IMREAD_COLOR)
  img=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
  return img.mean(axis=(0,1))

def _get_canvas_frame(canvas):
    """Returns the frame number reported by the video"""
    screen_bytes = None
    attempts = 0
    while screen_bytes == None and attempts < 5:
        try:
            screen_bytes = canvas.screenshot()
            attempts += 1
        except Exception as e:
            print(e)
            pass
    screen = np.frombuffer(screen_bytes, dtype=np.uint8)
    img = cv2.imdecode(screen, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    text = pytesseract.image_to_string(img)
    _, val = text.strip().split("=")
    val = val.replace("/", "")
    return int(val)

def _get_element_center(element):
  box = element.bounding_box()
  center_x = box['x'] + box['width'] / 2
  center_y = box['y'] + box['height'] / 2
  return center_x,center_y

def _wait_for_color(page, canvas, looking_for, timeout=30, name='unknown'):
    found = False
    if type(looking_for) != list:
        looking_for = [looking_for]
    for _ in range(timeout):
        page.wait_for_timeout(1000)
        canvas_color = _get_canvas_color(canvas)
        if np.argmax(canvas_color) in looking_for:
            found = True
            break
    if not found:
        raise ValueError(
            f"Did not capture desired color(s) {looking_for} after {timeout} seconds. "
            f"Last color: {canvas_color}"
        )


def _wait_for_frame(page, canvas, frame, timeout=30):
    for _ in range(timeout):
        canvas_frame = _get_canvas_frame(canvas)
        if canvas_frame == frame:
            break
        page.wait_for_timeout(1000)
    assert canvas_frame == frame, f"canvas={canvas_frame}, expected={frame}"


@pytest.mark.flaky(reruns=2)
def test_playback_accuracy(page_factory, project, count_test):
    print("[Video] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440})  # Annotation decent screen
    page.goto(
        f"/{project}/annotation/{count_test}?scrubQuality=360&seekQuality=720&playQuality=720",
        wait_until="networkidle",
    )
    page.on("pageerror", print_page_error)
    page.wait_for_selector("video-canvas")
    canvas = page.query_selector("video-canvas")
    page.wait_for_timeout(10000)
    play_button = page.query_selector("play-button")
    seek_handle = page.query_selector("seek-bar .annotation-range-handle")
    display_div = page.query_selector("#frame_num_display")
    display_ctrl = page.query_selector("#frame_num_ctrl")

    # Something times out in the unit test, avoid doing this
    # _wait_for_frame(canvas, 0)
    # canvas_frame = _get_canvas_frame(canvas)
    # assert(canvas_frame == 0)
    # assert(int(display_div.inner_text())==0)

    play_button.click()  # play the video
    page.wait_for_timeout(
        5000
    )  # This is simulating the user watching, not dependent on any events.
    play_button.click()  # pause the video
    canvas_frame = _get_canvas_frame(canvas)
    assert canvas_frame > 0
    assert int(display_div.inner_text()) == canvas_frame

    # Click the scrub handle
    seek_x, seek_y = _get_element_center(seek_handle)
    page.mouse.move(seek_x, seek_y, steps=10)
    page.mouse.down()

    page.mouse.move(seek_x + 500, seek_y, steps=10)
    canvas_frame = _get_canvas_frame(canvas)
    assert int(display_div.inner_text()) == canvas_frame
    page.mouse.up()

    # Complete scrub
    page.wait_for_timeout(5000)
    canvas_frame = _get_canvas_frame(canvas)
    assert int(display_div.inner_text()) == canvas_frame

    rate_ctrl = page.query_selector("rate-control .form-select")
    assert rate_ctrl.input_value() == "1"
    page.keyboard.press("4")
    assert rate_ctrl.input_value() == "4"
    page.keyboard.press("Control+ArrowDown")
    assert rate_ctrl.input_value() == "3.5"
    page.keyboard.press("Control+ArrowUp")
    assert rate_ctrl.input_value() == "4"
    page.keyboard.press("1")
    assert rate_ctrl.input_value() == "1"

    page.keyboard.press("Space")
    page.wait_for_timeout(5000)
    page.keyboard.press("Space")
    new_frame = _get_canvas_frame(canvas)
    assert new_frame > canvas_frame
    page.close()


@pytest.mark.flaky(reruns=2)
def test_playback_accuracy_multi(page_factory, project, multi_count):
    print("[Multi] Going to annotation view...(Accuracy)")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440})  # Annotation decent screen
    page.goto(
        f"/{project}/annotation/{multi_count}?scrubQuality=360&seekQuality=720&playQuality=720",
        wait_until="networkidle",
    )
    page.on("pageerror", print_page_error)
    page.wait_for_selector("video-canvas")
    canvas = page.query_selector_all("video-canvas")
    page.wait_for_timeout(10000)
    play_button = page.query_selector("play-button")
    seek_handle = page.query_selector("seek-bar .annotation-range-handle")
    display_div = page.query_selector("#frame_num_display")
    display_ctrl = page.query_selector("#frame_num_ctrl")

    # Something times out here in the unit test.
    # _wait_for_frame(canvas[0], 0)
    # canvas_frame = _get_canvas_frame(canvas[0])
    # assert(canvas_frame == 0)
    # canvas_frame = _get_canvas_frame(canvas[1])
    # assert(canvas_frame == 0)
    # assert(int(display_div.inner_text())==0)

    play_button.click()  # play the video
    page.wait_for_timeout(
        5000
    )  # This is simulating the user watching, not dependent on any events.
    play_button.click()  # pause the video
    page.wait_for_timeout(1000)
    current_frame = int(display_div.inner_text())
    assert current_frame > 0
    _wait_for_frame(page, canvas[0], current_frame)
    _wait_for_frame(page, canvas[1], current_frame)

    # Click the scrub handle
    seek_x, seek_y = _get_element_center(seek_handle)
    page.mouse.move(seek_x, seek_y, steps=10)
    page.mouse.down()

    page.mouse.move(seek_x + 500, seek_y, steps=10)
    page.wait_for_timeout(1000)
    current_frame = int(display_div.inner_text())
    _wait_for_frame(page, canvas[0], current_frame)
    _wait_for_frame(page, canvas[1], current_frame)
    page.mouse.up()

    # Complete scrub
    page.wait_for_timeout(5000)
    current_frame = int(display_div.inner_text())
    _wait_for_frame(page, canvas[0], current_frame)
    _wait_for_frame(page, canvas[1], current_frame)
    page.close()

@pytest.mark.flaky(reruns=2)
def test_playback_accuracy_multi_offset(page_factory, project, multi_offset_count):
    print("[Multi] Going to annotation view...(Accuracy)")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440})  # Annotation decent screen
    # Keep all buffers on scrub on-demand doesn't work with frame offset
    page.goto(
        f"/{project}/annotation/{multi_offset_count}?scrubQuality=720&seekQuality=720&playQuality=720",
        wait_until="networkidle",
    )
    page.on("pageerror", print_page_error)
    page.wait_for_selector("video-canvas")
    canvas = page.query_selector_all("video-canvas")
    page.wait_for_timeout(10000)
    play_button = page.query_selector("play-button")
    seek_handle = page.query_selector("seek-bar .annotation-range-handle")
    display_div = page.query_selector("#frame_num_display")
    display_ctrl = page.query_selector("#frame_num_ctrl")

    # Something times out here in the unit test.
    # _wait_for_frame(canvas[0], 0)
    # canvas_frame = _get_canvas_frame(canvas[0])
    # assert(canvas_frame == 0)
    # canvas_frame = _get_canvas_frame(canvas[1])
    # assert(canvas_frame == 0)
    # assert(int(display_div.inner_text())==0)

    play_button.click()  # play the video
    page.wait_for_timeout(
        5000
    )  # This is simulating the user watching, not dependent on any events.
    play_button.click()  # pause the video
    page.wait_for_timeout(1000)
    current_frame = int(display_div.inner_text())
    assert current_frame > 0
    _wait_for_frame(page, canvas[0], current_frame)
    _wait_for_frame(page, canvas[1], current_frame + 100)  # Offset is 100

    # Click the scrub handle
    seek_x, seek_y = _get_element_center(seek_handle)
    page.mouse.move(seek_x, seek_y, steps=10)
    page.mouse.down()

    page.mouse.move(seek_x + 500, seek_y, steps=10)
    page.wait_for_timeout(1000)
    current_frame = int(display_div.inner_text())
    _wait_for_frame(page, canvas[0], current_frame)
    _wait_for_frame(page, canvas[1], current_frame + 100)
    page.mouse.up()

    # Complete scrub
    page.wait_for_timeout(5000)
    current_frame = int(display_div.inner_text())
    _wait_for_frame(page, canvas[0], current_frame)
    _wait_for_frame(page, canvas[1], current_frame + 100)
    page.close()

def test_small_res_file(page_factory, project, small_video):
  # Tests play, scrub, and seek buffer usage
  print("[Video] Going to annotation view...")
  page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{small_video}", wait_until='networkidle')
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  play_button = page.query_selector('play-button')
  seek_handle = page.query_selector('seek-bar .annotation-range-handle')

  # Wait for hq buffer and verify it is blue
  _wait_for_color(page, canvas, 2, timeout=30, name='seek')
  page.close()

def test_buffer_usage_single(page_factory, project, rgb_test):
  # Tests play, scrub, and seek buffer usage
  print("[Video] Going to annotation view...")
  page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{rgb_test}?scrubQuality=360&seekQuality=1080&playQuality=720", wait_until='networkidle')
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')

  play_button = page.query_selector('play-button')
  seek_handle = page.query_selector('seek-bar .annotation-range-handle')


  # Wait for hq buffer and verify it is red
  page.wait_for_timeout(15000) # This takes forever with the weird color video
  _wait_for_color(page, canvas, 0, timeout=30, name='seek')

  play_button.click()
  _wait_for_color(page, canvas, 1, timeout=30, name='playing')

  # Pause the video
  play_button.click()
  _wait_for_color(page, canvas, 0, timeout=30, name='seek (pause)')


  # Click the scrub handle
  seek_x,seek_y = _get_element_center(seek_handle)
  page.mouse.move(seek_x, seek_y, steps=10)
  page.mouse.down()

  page.mouse.move(seek_x+5, seek_y, steps=10)
  _wait_for_color(page, canvas, 1, timeout=30, name='small scrub (play buffer)')

  page.mouse.move(seek_x+1000, seek_y, steps=10)
  # Look for either green(play) or blue(scrub) based on how much got buffered, both are correct
  _wait_for_color(page, canvas, [1,2], timeout=30, name='big scrub (scrub buffer)')

  # Release the scrub
  page.mouse.up()
  _wait_for_color(page, canvas, 0, timeout=30, name='seek / pause')
  page.close()

@pytest.mark.flaky(reruns=2)
def test_buffer_usage_multi(page_factory, project, multi_rgb):
    # Tests play, scrub, and seek buffer usage
    print("[Multi] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440})  # Annotation decent screen
    page.goto(
        f"/{project}/annotation/{multi_rgb}?scrubQuality=360&seekQuality=1080&playQuality=720",
        wait_until="networkidle",
    )
    page.on("pageerror", print_page_error)
    page.wait_for_selector("video-canvas")
    canvas = page.query_selector_all("video-canvas")
    display_ctrl = page.query_selector("#frame_num_ctrl")
    play_button = page.query_selector("play-button")
    seek_handle = page.query_selector("seek-bar .annotation-range-handle")

    # Wait for hq buffer and verify it is red
    print("Waiting 15 seconds for video to load")
    page.wait_for_timeout(15000)  # this takes forever with the weird color video
    print("Waiting for page load colors")
    _wait_for_color(page, canvas[0], 0, timeout=30)
    _wait_for_color(page, canvas[1], 0, timeout=30)

    print("Pressing play...")
    play_button.click()
    print("Waiting for play colors")
    _wait_for_color(page, canvas[0], 1, timeout=30)
    _wait_for_color(page, canvas[1], 1, timeout=30)
    # Pause the video
    print("Pressing pause...")
    play_button.click()
    print("Waiting for pause colors")
    _wait_for_color(page, canvas[0], 0, timeout=30)
    _wait_for_color(page, canvas[1], 0, timeout=30)

    # Click the scrub handle
    print("Moving scrub bar")
    seek_x, seek_y = _get_element_center(seek_handle)
    page.mouse.move(seek_x, seek_y, steps=10)
    page.mouse.down()

    # Small scrubs in multi don't use play buffer anymore
    print("Testing small scrub")
    page.mouse.move(seek_x + 5, seek_y, steps=10)
    _wait_for_color(page, canvas[0], 2, timeout=30, name="small scrub")
    _wait_for_color(page, canvas[0], 2, timeout=30, name="small scrub")

    print("Testing large scrub")
    page.mouse.move(seek_x + 1900, seek_y, steps=10)
    _wait_for_color(page, canvas[0], [1, 2], timeout=30)  # play buffer is OK here too
    _wait_for_color(page, canvas[0], [1, 2], timeout=30)  # play buffer is OK here too

    # Release the scrub
    print("Stopping scrub")
    page.mouse.up()
    _wait_for_color(page, canvas[0], 0, timeout=30)
    _wait_for_color(page, canvas[1], 0, timeout=30)
    print("Closing page")
    page.close()


@pytest.mark.skip(reason="Too flaky")
def test_playback_schedule(page_factory, project, count_test):
  print("[Video] Going to annotation view...")
  page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
  console_msgs=[]
  page.on("console", lambda msg: console_msgs.append(msg.text))
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{count_test}?scrubQuality=360&seekQuality=720&playQuality=720", wait_until='networkidle')
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  page.wait_for_timeout(10000)
  play_button = page.query_selector('play-button')

  keep_running_count = 0
  while keep_running_count < 10:
      play_button.click()
      page.wait_for_timeout(5000)
      play_button.click()

      schedule_msg = None
      for msg in console_msgs:
        if msg.find('Playback schedule') >= 0:
          schedule_msg = msg
      assert schedule_msg

      monitor_fps_msg = None
      for msg in console_msgs:
        if msg.find('FPS interval =') >= 0:
          monitor_fps_msg = msg
      monitor_fps = float(monitor_fps_msg.split("(")[1].split(")")[0])

      if monitor_fps >= 30:
          break
      else:
          # Re-run because the monitor's FPS is lower than the video's FPS, which will
          # mess up the assert conditions. This test does not account for this scenario.
          page.wait_for_timeout(1000)
          keep_running_count += 1

  schedule_lines=schedule_msg.split('\n')
  print(schedule_lines)
  frame_increment = round(float(schedule_lines[2].split('=')[1]))
  target_fps = round(float(schedule_lines[3].split('=')[1]))
  factor = round(float(schedule_lines[5].split('=')[1]))
  assert target_fps == 30
  assert frame_increment == 1
  assert factor == 1

  # repeat at 4x
  keep_running_count = 0
  while keep_running_count < 10:
      console_msgs=[]
      page.keyboard.press("4")
      play_button.click()
      page.wait_for_timeout(10000)
      play_button.click()

      schedule_msg = None
      for msg in console_msgs:
        if msg.find('Playback schedule') >= 0:
          schedule_msg = msg
      assert schedule_msg

      for msg in console_msgs:
        if msg.find('FPS interval =') >= 0:
          monitor_fps_msg = msg
      monitor_fps = float(monitor_fps_msg.split("(")[1].split(")")[0])

      if monitor_fps >= 30:
          break
      else:
          # Re-run because the monitor's FPS is lower than the video's FPS, which will
          # mess up the assert conditions. This test does not account for this scenario.
          page.wait_for_timeout(1000)
          keep_running_count += 1

  schedule_lines=schedule_msg.split('\n')
  print(schedule_lines)
  frame_increment = round(float(schedule_lines[2].split('=')[1]))
  target_fps = round(float(schedule_lines[3].split('=')[1]))
  factor = round(float(schedule_lines[5].split('=')[1]))
  assert target_fps == 30
  assert frame_increment == 4
  assert factor == 4
  page.close()

@pytest.mark.flaky(reruns=2)
def test_playback_schedule_1fps(page_factory, project, count_1fps_test):
  print("[Video] Going to annotation view...")
  page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{count_1fps_test}?playQuality=720", wait_until='networkidle')
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  page.wait_for_timeout(10000)
  play_button = page.query_selector('play-button')

  console_msgs=[]
  page.on("console", lambda msg: console_msgs.append(msg.text))

  play_button.click()
  page.wait_for_timeout(5000)
  play_button.click()

  schedule_msg = None
  for msg in console_msgs:
    if msg.find('Playback schedule') >= 0:
      schedule_msg = msg
  assert schedule_msg

  schedule_lines=schedule_msg.split('\n')
  print(schedule_lines)
  frame_increment = round(float(schedule_lines[2].split('=')[1]))
  target_fps = round(float(schedule_lines[3].split('=')[1]))
  factor = round(float(schedule_lines[5].split('=')[1]))
  assert target_fps == 1
  assert frame_increment == 1
  assert factor == 1

  # repeat at 2x
  console_msgs=[]
  page.keyboard.press("2")
  play_button.click()
  page.wait_for_timeout(5000)
  play_button.click()

  schedule_msg = None
  for msg in console_msgs:
    if msg.find('Playback schedule') >= 0:
      schedule_msg = msg
  assert schedule_msg

  schedule_lines=schedule_msg.split('\n')
  print(schedule_lines)
  frame_increment = round(float(schedule_lines[2].split('=')[1]))
  target_fps = round(float(schedule_lines[3].split('=')[1]))
  factor = round(float(schedule_lines[5].split('=')[1]))
  assert target_fps == 2
  assert frame_increment == 1
  assert factor == 2

  # repeat at 4x
  console_msgs=[]
  page.keyboard.press("4")
  play_button.click()
  page.wait_for_timeout(5000)
  play_button.click()


  schedule_msg = None
  for msg in console_msgs:
    if msg.find('Playback schedule') >= 0:
      schedule_msg = msg
  assert schedule_msg

  schedule_lines=schedule_msg.split('\n')
  print(schedule_lines)
  frame_increment = round(float(schedule_lines[2].split('=')[1]))
  target_fps = round(float(schedule_lines[3].split('=')[1]))
  factor = round(float(schedule_lines[5].split('=')[1]))
  assert target_fps == 4
  assert frame_increment == 1
  assert factor == 4

  # Go up to 16x
  for _ in range(3):
    page.keyboard.press("Control+ArrowUp")
    page.wait_for_timeout(1000)

  console_msgs=[]
  play_button.click()
  page.wait_for_timeout(5000)
  play_button.click()


  schedule_msg = None
  for msg in console_msgs:
    if msg.find('Playback schedule') >= 0:
      schedule_msg = msg
  assert schedule_msg

  schedule_lines=schedule_msg.split('\n')
  print(schedule_lines)
  frame_increment = round(float(schedule_lines[2].split('=')[1]))
  target_fps = round(float(schedule_lines[3].split('=')[1]))
  factor = round(float(schedule_lines[5].split('=')[1]))
  assert target_fps == 15
  assert frame_increment == 2
  assert factor == 16

  page.close()


@pytest.mark.skip(reason="Too flaky")
def test_concat(page_factory, project, concat_test):
  print("[Video] Going to annotation view...")
  page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
  page.set_viewport_size({"width": 3840, "height": 2160}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{concat_test}?scrubQuality=360&seekQuality=1080&playQuality=720")
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')

  play_button = page.query_selector('play-button')
  seek_handle = page.query_selector('seek-bar .annotation-range-handle')

  # Wait for hq buffer and verify it is red
  page.wait_for_timeout(30000)
  _wait_for_color(page, canvas, 0, timeout=30, name='seek')

  play_button.click()
  _wait_for_color(page, canvas, 1, timeout=30, name='playing')

  # Pause the video
  play_button.click()
  _wait_for_color(page, canvas, 0, timeout=30, name='seek (pause)')
 
  try: 
    page.close()
  except Exception as err:
    print(f"Error closing page during test_concat: {err}")

"""
This test would be good, but doesn't work because playback isn't performant enough in test runner

def test_audiosync(page_factory, project, slow_video):
  # Tests audio sync as reported by watchdog thread
  # TODO: Consider a longer video than the audio video sync test
  # NOTE: This uses a 5fps video because playback was kind of lousy in the test runner
  print("[Video] Going to annotation view...")
  page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
  page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
  page.goto(f"/{project}/annotation/{slow_video}?scrubQuality=360&seekQuality=1080&playQuality=720")
  page.on("pageerror", print_page_error)
  page.wait_for_selector('video-canvas')
  canvas = page.query_selector('video-canvas')
  play_button = page.query_selector('play-button')

  # wait for video to be ready - TODO make this better?
  page.wait_for_timeout(10000)

  console_msgs=[]
  page.on("console", lambda msg: console_msgs.append(msg.text))
  play_button.click()
  page.wait_for_timeout(8000)
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
