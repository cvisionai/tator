import os
import inspect
import requests
import math

from ._common import print_page_error

# Annotate media 5 boxes
# Go to Loc gallery
# Hide and show labels
# Go to Cor gallery
# Bulk Edit
# Back to Loc gallery filter on Edit
# Confirm the count
def test_basic(request, page_factory, project, image, video): #image 
   print("Loc and Cor Gallery tests...")
   print("Going to annotation view to create annotations")
   page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
   page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation a decent screen
   
   # Image annotations
   page.goto(f"/{project}/annotation/{image}", wait_until='networkidle')
   page.on("pageerror", print_page_error)
   page.wait_for_selector('image-canvas')
   canvas = page.query_selector('image-canvas')
   canvas_box = canvas.bounding_box()
   print(f"Canvas info: {canvas_box}")
   canvas_center_x = canvas_box['x'] + canvas_box['width'] / 2
   canvas_center_y = canvas_box['y'] + canvas_box['height'] / 2
   print("Drawing boxes with different enum values...")
   box_info = [((-200, -50), 'Test Choice 1'),
                ((-50, -50), 'Test Choice 2'),
                ((-40, -40), 'Test Choice 2'),
                ((100, -50), 'Test Choice 3'),
                ((100, -60), 'Test Choice 3'),
                ((90, -50), 'Test Choice 3'),
                ((20, -20), 'Test Choice 3'),
                ((-30, -10), 'Test Choice 3')]
   
   for idx, (start, enum_value) in enumerate(box_info):
      page.click('box-button:not(.disabled)')
      x, y = start
      x += canvas_center_x
      y += canvas_center_y
      print(f"Create Box {x},{y}")
      width = 100
      height = 100
      page.mouse.move(x, y, steps=50)
      page.wait_for_timeout(1000)
      page.mouse.down()
      page.wait_for_timeout(1000)
      page.mouse.move(x + width, y + height, steps=50)
      page.wait_for_timeout(1000)
      page.mouse.up()
      page.wait_for_selector('save-dialog.is-open')
      save_dialog = page.query_selector('save-dialog.is-open')
      enum_input = save_dialog.query_selector('enum-input[name="Test Enum"]')
      enum_input.query_selector('select').select_option(enum_value)
      save_dialog.query_selector('text="Save"').click()
      light = page.query_selector('#tator-success-light')
      light.wait_for_element_state('visible')
      light.wait_for_element_state('hidden')
   
   # Video annotations
   print("[Video] Going to annotation view...")
   page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
   page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
   page.goto(f"/{project}/annotation/{video}", wait_until='networkidle')
   page.on("pageerror", print_page_error)
   page.wait_for_selector('video-canvas')
   canvas = page.query_selector('video-canvas')
   page.wait_for_selector('play-button:not(.disabled)')
   canvas_box = canvas.bounding_box()
   print(f"Canvas info: {canvas_box}")
   canvas_center_x = canvas_box['x'] + canvas_box['width'] / 2
   canvas_center_y = canvas_box['y'] + canvas_box['height'] / 2
   print("Drawing boxes with different enum values...")
   box_info = [((-200, -50), 'Test Choice 1'),
                ((-50, -50), 'Test Choice 2'),
                ((-40, -40), 'Test Choice 2'),
                ((100, -50), 'Test Choice 3'),
                ((100, -60), 'Test Choice 3'),
                ((90, -50), 'Test Choice 3'),
                ((20, -20), 'Test Choice 3'),
                ((-30, -10), 'Test Choice 3')]
   
   for idx, (start, enum_value) in enumerate(box_info):
      page.click('box-button:not(.disabled)')
      x, y = start
      x += canvas_center_x
      y += canvas_center_y
      print(f"Create Box {x},{y}")
      width = 100
      height = 100
      page.mouse.move(x, y, steps=50)
      page.wait_for_timeout(1000)
      page.mouse.down()
      page.wait_for_timeout(1000)
      page.mouse.move(x + width, y + height, steps=50)
      page.wait_for_timeout(1000)
      page.mouse.up()
      page.wait_for_selector('save-dialog.is-open')
      save_dialog = page.query_selector('save-dialog.is-open')
      enum_input = save_dialog.query_selector('enum-input[name="Test Enum"]')
      enum_input.query_selector('select').select_option(enum_value)
      save_dialog.query_selector('text="Save"').click()
      light = page.query_selector('#tator-success-light')
      light.wait_for_element_state('visible')
      light.wait_for_element_state('hidden')
   




   # 
   print("Going to localizations gallery")
   page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
   page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation a decent screen
   page.goto(f"/{project}/analytics/localizations", wait_until='networkidle')
   

   # confirm count
   cards = page.query_selector_all('.enitity-gallery entity-card[style="display: block;"]')
   print(f'Got to localization gallery, showing {len(cards)} cards')
   
   # Show Test Enum
   page.query_selector('.entity-gallery-tools--more #icon-more-horizontal').click()
   page.wait_for_selector('text="Localization Labels"')
   page.query_selector('text="Localization Labels"').click()

   attribute_selected_name = "Test Enum"
   checkboxes = page.query_selector_all(f'.entity-gallery-labels .entity-gallery-labels--checkbox-div checkbox-input[name="{attribute_selected_name}"]')
   
   print(f'Label panel is open: found {len(checkboxes)} labels with this name {attribute_selected_name}....')
   checkboxes[0].click()  # for images
   checkboxes[2].click()  # for video
   
   page.query_selector('.enitity-gallery__labels-div nav-close').click()

