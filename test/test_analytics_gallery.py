import os
import inspect
import requests
import math
import pytest

from ._common import print_page_error

# Annotate media 5 boxes
# Go to Loc gallery
# Hide and show labels
# Go to Cor gallery
# Bulk Edit
# Back to Loc gallery filter on Edit
# Confirm the count
def test_basic(request, page_factory, project, image1, video): #image 
   print("Loc and Cor Gallery tests...")

   print("Adding a new attr to filter on later.")
   page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
   page.goto(f"/{project}/project-settings", wait_until="networkidle")
   page.on("pageerror", print_page_error)

   # All Attr types
   dtype = "string"
   attr_name = "Reviewer"
   loc_type_in_view = "Test Boxes"

   # Add Attribute Types
   page.click('#sub-nav--heading-button[type="LocalizationType"]')
   page.wait_for_selector(f'text="{loc_type_in_view}"')
   page.click(f'text="{loc_type_in_view}"')
   formSelector = 'type-form-container[form="localization-edit"]'
   page.click(f"{formSelector} .add-new-in-form")
   page.wait_for_selector("modal-dialog form")
   page.fill('modal-dialog text-input[name="Name"] input', attr_name)
   page.select_option(f'modal-dialog enum-input[name="Data Type"] select', dtype)
   page.click('modal-dialog bool-input[name="Visible"] label[for="on"]')
   page.click('modal-dialog input[type="submit"]')
   page.wait_for_selector(f"text=\"New attribute type '{attr_name}' added\"")

   print("Going to annotation view to create annotations")
   page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
   page.set_viewport_size({"width": 2560, "height": 1440})  # Annotation a decent screen

   # Image annotations
   page.goto(f"/{project}/annotation/{image1}", wait_until="networkidle")
   page.on("pageerror", print_page_error)
   page.wait_for_selector("image-canvas")
   canvas = page.query_selector("image-canvas")
   canvas_box = canvas.bounding_box()
   print(f"Canvas info: {canvas_box}")
   print("Drawing boxes with different enum values...")
   box_info = [
      ((10, 10), "String1"),
      ((50, 10), "String2"),
      ((100, 10), "String2"),
      ((150, 10), "String3"),
      ((200, 10), "String3"),
      ((250, 10), "String3"),
      ((300, 10), "String3"),
      ((350, 10), "String3"),
   ]

   for idx, (start, test_value) in enumerate(box_info):
      page.click("box-button:not(.disabled)")
      x, y = start
      print(f"Create Box {x},{y}")
      x += canvas_box["x"]
      y += canvas_box["y"]
      width = 100
      height = 100
      page.mouse.move(x, y, steps=50)
      page.wait_for_timeout(1000)
      page.mouse.down()
      page.wait_for_timeout(1000)
      page.mouse.move(x + width, y + height, steps=50)
      page.wait_for_timeout(1000)
      page.mouse.up()
      page.wait_for_selector("save-dialog.is-open")
      save_dialog = page.query_selector("save-dialog.is-open")
      test_input = save_dialog.query_selector(f'text-input[name="{attr_name}"] input')
      test_input.fill(test_value)
      save_dialog.query_selector('text="Save"').click()
      light = page.query_selector("#tator-success-light")
      light.wait_for_element_state("visible")
      light.wait_for_element_state("hidden")

   # TODO expand to video, and multi annotations?

   # Go to gallery and try filtering on Reviewer Attr
   print("Going to localizations gallery")
   page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
   page.set_viewport_size({"width": 2560, "height": 1440})  # Annotation a decent screen

   # Note: This timeout was increased when running in a test environment on production. The data was being accessed
   # on a production database with larger index creation times. Whilst the indices were being created, the accesses
   # were slightly slower.
   page.goto(f"/{project}/analytics/localizations", wait_until="networkidle", timeout=60000)

   # # Get all the loc on page
   page.select_option(".pagination select.form-select", value="100")
   page.wait_for_timeout(5000)

   # # confirm count
   cards = page.query_selector_all('.entity-gallery entity-card[style="display: block;"]')
   print(f"Got to localization gallery, showing {len(cards)} cards")

   # # Show Test Enum
   attribute_selected_name = attr_name
   page.query_selector(".entity-gallery-tools--more #icon-more-horizontal").click()
   page.wait_for_selector(".menu-link-button")
   button = page.query_selector(".menu-link-button")
   button.dispatch_event("click")
   page.wait_for_timeout(5000)

   # for Box loc type
   checkboxes = page.query_selector_all(
      f'.entity-gallery-labels .entity-gallery-labels--checkbox-div checkbox-input[name="{attribute_selected_name}"]'
   )
   checkboxes[0].dispatch_event("click")
   page.query_selector(".entity-gallery__labels-div nav-close").click()
   page.wait_for_timeout(5000)

   # Count results by attr value -- should be 1,2,5
   # How many are String1
   choice_one_text = "String1"
   choice_ones = page.query_selector_all(f'text=": {choice_one_text}"')
   print(f'Text with "String1": found {len(choice_ones)}')

   # How many are String2
   choice_two_text = "String2"
   choice_twos = page.query_selector_all(f'text=": {choice_two_text}"')
   print(f'Text with "String2": found {len(choice_twos)}')

   # How many are String3
   choice_three_text = "String3"
   choice_threes = page.query_selector_all(f'text=": {choice_three_text}"')
   print(f'Text with "String3": found {len(choice_threes)}')

   # Filter test
   print("Start: Test Filtering")
   page.query_selector('text="Filter"').click()
   # button
   page.wait_for_selector("filter-condition-group button.btn.btn-outline.btn-small")
   page.click("filter-condition-group button.btn.btn-outline.btn-small")

   page.wait_for_selector('enum-input[name="Category"]')
   page.select_option('enum-input[name="Category"] select', label="Localization")

   page.wait_for_selector('enum-input[name="Field"]')
   page.select_option('enum-input[name="Field"] select', value=attr_name)

   page.wait_for_selector('enum-input[name="Modifier"]')
   page.select_option('enum-input[name="Modifier"] select', label="Equals")

   page.wait_for_selector('text-input[name="Value"] input')
   page.fill('text-input[name="Value"] input', choice_three_text)

   filterGroupButton = page.query_selector(
      ".analysis__filter_conditions_interface .modal__footer button"
   )
   filterGroupButton.click()

   page.wait_for_selector('entity-card[style="display: block;"]')

   cards = page.query_selector_all('entity-card[style="display: block;"]')
   cardLength = len(cards)

   for x in range(30):
      if cardLength != 5:
         page.wait_for_timeout(1000)
         cards = page.query_selector_all('entity-card[style="display: block;"]')
         cardLength = len(cards)
      else:
         break
   print(f"Cards length after search {cardLength} == 5")
   assert cardLength == 5

   # Repeat check for other attr -- should be 0,0,5
   # How many are String1
   choice_one_text = "String1"
   choice_ones = page.query_selector_all(f'text=": {choice_one_text}"')
   print(f'Text with "String1": found {len(choice_ones)}')

   # How many are String2
   choice_two_text = "String2"
   choice_twos = page.query_selector_all(f'text=": {choice_two_text}"')
   print(f'Text with "String2": found {len(choice_twos)}')

   # How many are String3
   choice_three_text = "String3"
   choice_threes = page.query_selector_all(f'text=": {choice_three_text}"')
   print(f'Text with "String3": found {len(choice_threes)}')

   # Go to corrections gallery
   # Check filter is same / labels are stills shown

   page.click("bulk-correct-button button")
   for x in range(30):
      if cardLength != 5:
         page.wait_for_timeout(1000)
         cards = page.query_selector_all('entity-card[style="display: block;"]')
         cardLength = len(cards)
      else:
         break

   # Repeat check for other attr -- should be 0,0,5
   cards = page.query_selector_all('entity-card[style="display: block;"]')
   cardLength = len(cards)
   print(f"Cards length after search {cardLength} == 5")
   assert cardLength == 5

   # How many are String1
   choice_one_text = "String1"
   choice_ones = page.query_selector_all(f'text=": {choice_one_text}"')
   print(f'Text with "String1": found {len(choice_ones)}')

   # How many are String2
   choice_two_text = "String2"
   choice_twos = page.query_selector_all(f'text=": {choice_two_text}"')
   print(f'Text with "String2": found {len(choice_twos)}')

   # How many are String3
   choice_three_text = "String3"
   choice_threes = page.query_selector_all(f'text=": {choice_three_text}"')
   print(f'Text with "String3": found {len(choice_threes)}')

   # Did label selection also preselect attributes?
   ## There should be one input checked
   bulk_checkboxes = page.query_selector_all(
      '.bulk-edit-attr-choices_bulk-edit input[value="Reviewer"]'
   )
   bulk_checkboxes[0].check()
   print(f"Assert selected inputs {len(bulk_checkboxes)} == Checked count 1")
   assert len(bulk_checkboxes) == 1

   # Select 2
   cards[1].click()
   cards[3].click()
   choice_four_text = "String4"
   page.fill('text-input[name="Reviewer"] input', choice_four_text)
   page.click(".bulk-edit-submit-button")
   page.wait_for_timeout(5000)

   page.wait_for_selector("modal-dialog .save-confirmation")
   page.click("modal-dialog .save-confirmation")
   page.wait_for_timeout(5000)

   # page.wait_for_selector(f'text=": {choice_four_text}"')
   choice_fours = page.query_selector_all(f'text=": {choice_four_text}"')
   print(f'Text with "String4": found {len(choice_fours)}')

   for x in range(30):
      if cardLength != 3:
         page.wait_for_timeout(1000)
         cards = page.query_selector_all('entity-card[style="display: block;"]')
         cardLength = len(cards)
      else:
         break
   cards = page.query_selector_all('entity-card[style="display: block;"]')
   cardLength = len(cards)
   print(f"Cards length after edit {cardLength} == (5-2) == 3")
   assert cardLength == 3

   # Now refilter it should go away....
   print("Re-Apply Filter")
   page.click('text="Filter"')
   page.wait_for_selector('enum-input[name="Category"]')
   filterGroupButtons = page.query_selector_all(
      ".analysis__filter_conditions_interface .modal__footer button"
   )
   filterGroupButtons[0].click()

   page.wait_for_selector('entity-card[style="display: block;"]')
   for x in range(30):
      if cardLength != 3:
         page.wait_for_timeout(1000)
         cards = page.query_selector_all('entity-card[style="display: block;"]')
         cardLength = len(cards)
      else:
         break

   cards = page.query_selector_all('entity-card[style="display: block;"]')
   cardLength = len(cards)
   print(f"Cards length after re-filter {cardLength} == 3")
   assert cardLength == 3

   choice_fours = page.query_selector_all(f'text=": {choice_four_text}"')
   print(f'Text with "String4": (should be 0) found {len(choice_fours)}')
