import os
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import Select

from ._common import go_to_uri
from ._common import ShadowManager

def test_annotation(browser, screenshots, project, video):
    print("Going to annotation view...")
    go_to_uri(browser, f"{project}/annotation/{video}")
    time.sleep(10)
    browser.save_screenshot(os.path.join(screenshots, '00_annotation_view_done_loading.png'))
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
        browser.save_screenshot(os.path.join(screenshots, f"{idx+1:02d}_drawing_boxes.png"))
        buttons = mgr.find_shadow_tree_elements(save_shadow, By.TAG_NAME, "button")
        for button in buttons:
            if button.get_attribute("textContent") == "Save":
                button.click()
                break
        time.sleep(1)
    browser.save_screenshot(os.path.join(screenshots, '04_three_boxes_different_colors.png'))
        
    
