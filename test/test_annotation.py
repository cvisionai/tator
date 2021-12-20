import os
import time

from ._common import print_page_error

# Common function for checking annotation capability
def common_annotation(page, canvas):
    canvas_box = canvas.bounding_box()
    print(f"Canvas info: {canvas_box}")
    canvas_center_x = canvas_box['x'] + canvas_box['width'] / 2
    canvas_center_y = canvas_box['y'] + canvas_box['height'] / 2
    print("Drawing three boxes with different enum values...")
    box_info = [((-200, -50), 'Test Choice 1'),
                ((-50, -50), 'Test Choice 2'),
                ((100, -50), 'Test Choice 3')]
    for idx, (start, enum_value) in enumerate(box_info):
        page.click('box-button')
        x, y = start
        x += canvas_center_x
        y += canvas_center_y
        print(f"Create Box {x},{y}")
        width = 100
        height = 100
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + width, y + height)
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
        selector.wait_for_selector(f'#current-index :text("{idx+1}")')
        page.mouse.move(x+50, y+50)
        page.mouse.down()
        time.sleep(1)
        page.mouse.move(x, y)
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
        selector.wait_for_selector(f'#current-index :text("{idx+1}")')
        page.mouse.move(x+45, y+45)
        page.mouse.down()
        time.sleep(1)
        page.mouse.move(x+95, y+95)
        page.mouse.up()
        light = page.query_selector('#tator-success-light')
        light.wait_for_element_state('visible')
        light.wait_for_element_state('hidden')


def test_video_annotation(authenticated, project, video):
    print("[Video] Going to annotation view...")
    page = authenticated.new_page()
    page.goto(f"/{project}/annotation/{video}")
    page.on("pageerror", print_page_error)
    page.wait_for_selector('video-canvas')
    canvas = page.query_selector('video-canvas')
    common_annotation(page, canvas)
    
def test_image_annotation(authenticated, project, image):
    print("[Image] Going to annotation view...")
    page = authenticated.new_page()
    page.goto(f"/{project}/annotation/{image}")
    page.on("pageerror", print_page_error)
    page.wait_for_selector('image-canvas')
    canvas = page.query_selector('image-canvas')
    time.sleep(2)
    common_annotation(page, canvas)