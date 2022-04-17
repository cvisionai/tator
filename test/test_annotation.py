import os
import time
import inspect

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
    for idx, (start, enum_value) in enumerate(box_info):
        page.click('box-button:not(.disabled)')
        x, y = start
        x += canvas_center_x
        y += canvas_center_y
        print(f"Create Box {x},{y}")
        width = 100
        height = 100
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + width, y + height, steps=20)
        page.mouse.up()
        page.wait_for_selector('save-dialog.is-open')
        save_dialog = page.query_selector('save-dialog.is-open')
        enum_input = save_dialog.query_selector('enum-input[name="Test Enum"]')
        enum_input.query_selector('select').select_option(enum_value)
        save_dialog.query_selector('text="Save"').click()
        light = page.query_selector('#tator-success-light')
        light.wait_for_element_state('visible')
        light.wait_for_element_state('hidden')
    # Move boxes
    print("Moving boxes...")
    for idx, (start, enum_value) in enumerate(box_info):
        x, y = start
        x += canvas_center_x
        y += canvas_center_y
        page.mouse.click(x+50, y+50)
        selector = page.query_selector('entity-selector:visible')
        selector.wait_for_selector(f'#current-index :text("{idx+1+bias}")')
        page.mouse.move(x+50, y+50,steps=20)
        page.mouse.down()
        page.mouse.move(x, y, steps=20)
        page.mouse.up()
        light = page.query_selector('#tator-success-light')
        light.wait_for_element_state('visible')
        light.wait_for_element_state('hidden')
    # Resize boxes
    print("Resizing boxes...")
    for idx, (start, enum_value) in enumerate(box_info):
        x, y = start
        x += canvas_center_x
        y += canvas_center_y
        page.mouse.click(x+45, y+45)
        selector = page.query_selector('entity-selector:visible')
        selector.wait_for_selector(f'#current-index :text("{idx+1+bias}")')
        page.mouse.move(x+45, y+45, steps=20)
        page.mouse.down()
        page.mouse.move(x+95, y+95, steps=20)
        page.mouse.up()
        light = page.query_selector('#tator-success-light')
        light.wait_for_element_state('visible')
        light.wait_for_element_state('hidden')


def test_video_annotation(page_factory, project, video):
    print("[Video] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440}) # Annotation decent screen
    page.goto(f"/{project}/annotation/{video}")
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
    page.goto(f"/{project}/annotation/{image}")
    page.on("pageerror", print_page_error)
    page.wait_for_selector('image-canvas')
    canvas = page.query_selector('image-canvas')
    common_annotation(page, canvas)
    page.close()

def test_multi_annotation(page_factory, project, multi):
    print("[Multi] Going to annotation view...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.set_viewport_size({"width": 2560, "height": 1440}) # Multi requires a decent screen
    page.goto(f"/{project}/annotation/{multi}")
    page.on("pageerror", print_page_error)
    page.wait_for_selector('video-canvas')
    canvas = page.query_selector_all('video-canvas')
    page.wait_for_selector('play-button:not(.disabled)')
    assert(len(canvas) == 2)
    common_annotation(page, canvas[0])
    common_annotation(page, canvas[1], bias=3)
    page.close()
