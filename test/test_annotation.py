import os
import inspect
import pytest
import time

from ._common import print_page_error

# Common function for checking annotation capability
def common_annotation(page, canvas, bias=0):
    canvas_box = canvas.bounding_box()
    print(f"Canvas info: {canvas_box}")
    canvas_center_x = canvas_box['x'] + canvas_box['width'] / 2
    canvas_center_y = canvas_box['y'] + canvas_box['height'] / 2
    print("Drawing three boxes with different enum values...")
    box_info = [((-200, -50), 'Test Choice 1'),
                ((-50, -50), 'Test Choice 2'),
                ((100, -50), 'Test Choice 3')]
    elemental_ids = {}
    for idx, (start, enum_value) in enumerate(box_info):
        print("trying to click box-button")
        page.click('box-button:not(.disabled)')
        print("clicked box-button")
        x, y = start
        x += canvas_center_x
        y += canvas_center_y
        print(f"Create Box {x},{y}")
        width = 100
        height = 100
        page.mouse.move(x, y, steps=50)
        page.wait_for_timeout(500)
        page.mouse.down()
        page.wait_for_timeout(500)
        page.mouse.move(x + width, y + height, steps=50)
        page.wait_for_timeout(500)
        page.mouse.up()
        page.wait_for_selector('save-dialog.is-open')
        save_dialog = page.query_selector('save-dialog.is-open')
        enum_input = save_dialog.query_selector('enum-input[name="Test Enum"]')
        enum_input.query_selector('select').select_option(enum_value)
        save_dialog.query_selector('text="Save"').click()
        print("Waiting for success light...")
        light = page.query_selector('#tator-success-light')
        light.wait_for_element_state('visible')
        light.wait_for_element_state('hidden')
        print("Waiting for elemental id...")
        elemental_id_fields = page.query_selector_all("#metadata-combined-id")
        # find only the visible one
        visible_elemental_id_fields = [field for field in elemental_id_fields if field.is_visible()]
        elemental_id_field = visible_elemental_id_fields[0] if visible_elemental_id_fields else None
        value = elemental_id_field.text_content().split("@")[0].strip()
        while value == None:
            print("field invalid, waiting")
            value = elemental_id_field.text_content().split("@")[0].strip()
            page.wait_for_timeout(1000)

        print(f"{idx}: Elemental ID: {value}")
        elemental_ids[idx] = value
    # Move boxes
    print("Moving boxes...")
    for idx, (start, enum_value) in enumerate(box_info):
        x, y = start
        x += canvas_center_x
        y += canvas_center_y
        page.mouse.move(x+50, y+50, steps=50)
        page.wait_for_timeout(500)
        page.mouse.click(x+50, y+50)
        selector = page.query_selector("entity-selector:visible")
        selector.wait_for_selector(f'#current-index :text("{idx+1+bias}")')
        found = False
        for attempts in range(5):
            elemental_id_fields = page.query_selector_all("#metadata-combined-id")
            # find only the visible one
            visible_elemental_id_fields = [
                field for field in elemental_id_fields if field.is_visible()
            ]
            elemental_id_field = (
                visible_elemental_id_fields[0] if visible_elemental_id_fields else None
            )
            if elemental_id_field.text_content().split("@")[0].strip() == elemental_ids[idx]:
                found = True
                break
            page.wait_for_timeout(1000)

        assert found, "Elemental ID not found"

        page.wait_for_timeout(500)
        page.mouse.down()
        page.wait_for_timeout(500)
        page.mouse.move(x, y, steps=50)
        page.wait_for_timeout(500)
        page.mouse.up()
        light = page.query_selector('#tator-success-light')
        light.wait_for_element_state('visible')
        light.wait_for_element_state('hidden')
    # Resize boxes
    print("Resizing boxes...")
    for idx, (start, enum_value) in enumerate(box_info):
        print(f'Looping box info, at index: {idx}')
        x, y = start
        x += canvas_center_x
        y += canvas_center_y

        page.mouse.move(x+45, y+45, steps=50)
        page.wait_for_timeout(500)

        page.mouse.click(x+45, y+45)
        for attempts in range(5):
            elemental_id_fields = page.query_selector_all("#metadata-combined-id")
            # find only the visible one
            visible_elemental_id_fields = [
                field for field in elemental_id_fields if field.is_visible()
            ]
            elemental_id_field = (
                visible_elemental_id_fields[0] if visible_elemental_id_fields else None
            )
            print(elemental_id_field.text_content().split("@")[0].strip())
            if elemental_id_field.text_content().split("@")[0].strip() == elemental_ids[idx]:
                found = True
                break
            page.wait_for_timeout(1000)
        page.wait_for_timeout(500)

        page.mouse.down()
        page.wait_for_timeout(500)

        page.mouse.move(x+95, y+95, steps=50)
        page.wait_for_timeout(500)

        page.mouse.up()

        print(f'Wait for success light....')
        light = page.query_selector('#tator-success-light')
        light.wait_for_element_state('visible')
        light.wait_for_element_state('hidden')

        print(f'Success!')


def test_video_annotation(page_factory, project, video):
    print("[Video] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
    page.goto(f"/{project}/annotation/{video}", wait_until='networkidle')
    page.on("pageerror", print_page_error)
    page.wait_for_selector('video-canvas')
    canvas = page.query_selector('video-canvas')
    page.wait_for_selector('play-button:not(.disabled)')
    common_annotation(page, canvas)
    page.close()

def test_image_annotation(page_factory, project, image):
    print("[Image] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation a decent screen
    page.goto(f"/{project}/annotation/{image}", wait_until='networkidle')
    page.on("pageerror", print_page_error)
    page.wait_for_selector('image-canvas')
    canvas = page.query_selector('image-canvas')
    common_annotation(page, canvas)
    page.close()

def test_referenced_image_annotation(page_factory, project, referenced_image):
    print("[Image] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation a decent screen
    page.goto(f"/{project}/annotation/{referenced_image}", wait_until='networkidle')
    page.on("pageerror", print_page_error)
    page.wait_for_selector('image-canvas')
    canvas = page.query_selector('image-canvas')
    common_annotation(page, canvas)
    page.close()

def test_referenced_video_annotation(page_factory, project, referenced_video):
    print("[Video] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
    page.goto(f"/{project}/annotation/{referenced_video}", wait_until='networkidle')
    page.on("pageerror", print_page_error)
    page.wait_for_selector('video-canvas')
    canvas = page.query_selector('video-canvas')
    page.wait_for_selector('play-button:not(.disabled)')
    common_annotation(page, canvas)
    page.close()

def test_multi_annotation(page_factory, project, multi):
    print("[Multi] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440}) # Multi requires a decent screen
    page.on("pageerror", print_page_error)
    page.goto(f"/{project}/annotation/{multi}", wait_until='networkidle')
    page.wait_for_selector('video-canvas')
    canvas = page.query_selector_all('video-canvas')
    page.wait_for_selector('play-button:not(.disabled)')
    page.wait_for_timeout(2000) # Not sure what else to wait for here but sometimes vids load after play button enabled
    assert(len(canvas) == 2)
    common_annotation(page, canvas[0])
    common_annotation(page, canvas[1], bias=3)
    page.close()
