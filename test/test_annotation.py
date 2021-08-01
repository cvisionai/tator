import os
import time

from ._common import print_page_error

def test_annotation(authenticated, project, video):
    print("Going to annotation view...")
    page = authenticated.new_page()
    page.goto(f"/{project}/annotation/{video}")
    page.on("pageerror", print_page_error)
    canvas = page.query_selector('video-canvas')
    canvas_box = canvas.bounding_box()
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
        width = 100
        height = 100
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + width, y + height)
        page.mouse.up()
        save_dialog = page.query_selector('save-dialog.is-open')
        enum_input = save_dialog.query_selector('enum-input[name="Test Enum"]')
        enum_input.query_selector('select').select_option(enum_value)
        save_dialog.query_selector('text="Save"').click()
    """
    # Move boxes
    print("Moving and resizing boxes...")
    for idx, (start, enum_value) in enumerate(box_info):
        left, top = start
        ActionChains(browser)\
            .move_to_element(canvas)\
            .move_by_offset(left+50, top+50)\
            .click()\
            .pause(1)\
            .click_and_hold()\
            .move_by_offset(-50, -50)\
            .release()\
            .pause(1)\
            .move_by_offset(0, 100)\
            .click()\
            .perform()
    saver.save_screenshot('moved_boxes')
    # Resize boxes
    for idx, (start, enum_value) in enumerate(box_info):
        left, top = start
        ActionChains(browser)\
            .move_to_element(canvas)\
            .move_by_offset(left, top)\
            .click()\
            .pause(1)\
            .move_by_offset(45, 45)\
            .click_and_hold()\
            .move_by_offset(50, 50)\
            .release()\
            .pause(1)\
            .move_by_offset(0, 100)\
            .click()\
            .perform()
    saver.save_screenshot('resized_boxes')
    """
