import os
import time

def test_annotation(authenticated, screenshots, project):#, video):
    pass
    """
    print("Going to annotation view...")
    save_dir = os.path.join(screenshots, "annotation")
    os.makedirs(save_dir, exist_ok=True)
    saver = ScreenshotSaver(browser, save_dir)
    go_to_uri(browser, f"{project}/annotation/{video}")
    time.sleep(10)
    saver.save_screenshot('annotation_view_done_loading')
    # Draw three boxes
    print("Drawing three boxes with different enum values...")
    mgr = ShadowManager(browser)
    box_button = mgr.find_shadow_tree_element(browser, By.TAG_NAME, "box-button")
    canvas = mgr.find_shadow_tree_element(browser, By.TAG_NAME, "video-canvas")
    save_dialog = mgr.find_shadow_tree_element(browser, By.TAG_NAME, "save-dialog")
    save_shadow = mgr.expand_shadow_element(save_dialog)
    box_info = [((-200, -50), 'Test Choice 1'),
                ((-50, -50), 'Test Choice 2'),
                ((100, -50), 'Test Choice 3')]
    for idx, (start, enum_value) in enumerate(box_info):
        box_button.click()
        time.sleep(0.25)
        ActionChains(browser)\
            .move_to_element(canvas)\
            .move_by_offset(*start)\
            .click_and_hold()\
            .move_by_offset(100, 100)\
            .release()\
            .perform()
        time.sleep(0.25)
        options = mgr.find_shadow_tree_elements(save_shadow, By.TAG_NAME, "option")
        for option in options:
            if option.get_attribute('value') == enum_value:
                option.click()
        time.sleep(0.25)
        saver.save_screenshot(f"drawing_boxes_{idx}")
        buttons = mgr.find_shadow_tree_elements(save_shadow, By.TAG_NAME, "button")
        for button in buttons:
            if button.get_attribute("textContent") == "Save":
                button.click()
                break
        time.sleep(1)
    saver.save_screenshot('three_boxes_different_colors')
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
