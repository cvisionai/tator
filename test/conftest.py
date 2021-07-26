import os
import shutil
import time
import datetime
import subprocess
import tarfile

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import pytest
import requests

from ._common import ShadowManager

def pytest_addoption(parser):
    parser.addoption('--host', help='Tator host', default='https://adamant.duckdns.org')
    parser.addoption('--username', help='Username for login page.')
    parser.addoption('--password', help='Password for login page.')
    parser.addoption('--keep', help='Do not delete project when done', action='store_true')

def pytest_generate_tests(metafunc):
    if 'host' in metafunc.fixturenames:
          metafunc.parametrize('host', [metafunc.config.getoption('host')])
    if 'username' in metafunc.fixturenames:
          metafunc.parametrize('username', [metafunc.config.getoption('username')])
    if 'password' in metafunc.fixturenames:
          metafunc.parametrize('password', [metafunc.config.getoption('password')])

@pytest.fixture(scope='session')
def browser(request):
    """ Headless browser based on Chrome. Session is authenticated by entering
        username and password. """
    # Driver must be installed via `sudo apt-get install chromium-chromedriver`
    print("Setting up browser...")
    host = request.config.option.host
    username = request.config.option.username
    password = request.config.option.password
    keep = request.config.option.keep
    options = Options()
    options.headless = True
    browser = webdriver.Chrome(options=options)
    browser.set_window_size(1920, 1080)
    browser.get(host)
    time.sleep(1)
    assert(browser.current_url.endswith('/accounts/login/'))
    mgr = ShadowManager(browser)
    username_input = mgr.find_shadow_tree_element(browser, By.ID, 'id_username')
    password_input = mgr.find_shadow_tree_element(browser, By.ID, 'id_password')
    continue_button = mgr.find_shadow_tree_element(browser, By.CLASS_NAME, 'btn')
    username_input.send_keys(username)
    password_input.send_keys(password)
    continue_button.click()
    time.sleep(1)
    assert(browser.current_url.endswith('/projects/'))
    yield browser
    browser.quit()

@pytest.fixture(scope='session')
def token(request, browser):
    """ Token obtained via the API Token page. """
    print("Getting token...")
    host = request.config.option.host
    username = request.config.option.username
    password = request.config.option.password
    keep = request.config.option.keep
    browser.get(f"{host}/token")
    time.sleep(1)
    mgr = ShadowManager(browser)
    t0 = datetime.datetime.now()
    inputs = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'input')
    print(f"Time to find all input tags: {datetime.datetime.now() - t0}")
    for element in inputs:
        if element.get_attribute('type') == 'text':
            element.send_keys(username)
        elif element.get_attribute('type') == 'password':
            element.send_keys(password)
        elif element.get_attribute('type') == 'submit':
            button = element
    button.click()
    time.sleep(1)
    browser.save_screenshot('/home/jon/test.png')
    t0 = datetime.datetime.now()
    p_list = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'p')
    print(f"Time to find all p tags: {datetime.datetime.now() - t0}")
    for p in p_list:
        token = p.get_attribute('textContent')
        if len(token) == 40:
            break
    yield token

@pytest.fixture(scope='session')
def project(request, browser, token):
    """ Project created with setup_project.py script, all options enabled. """
    print("Creating test project with setup_project.py...")
    host = request.config.option.host
    current_dt = datetime.datetime.now()
    dt_str = current_dt.strftime('%Y_%m_%d__%H_%M_%S')
    name = f"test_front_end_{dt_str}"
    cmd = [
        'python3',
        'scripts/packages/tator-py/examples/setup_project.py',
        '--host', host,
        '--token', token,
        '--name', name,
        '--create-state-latest',
        '--create-state-range-type',
        '--create-track-type',
    ]
    subprocess.run(cmd, check=True)
    browser.get(f"{host}/projects")
    
    time.sleep(1)
    mgr = ShadowManager(browser)
    # Find all project summary elements.
    dashboard = browser.find_element(By.TAG_NAME, 'projects-dashboard')
    shadow = mgr.expand_shadow_element(dashboard)
    summaries = mgr.find_shadow_tree_elements(shadow, By.TAG_NAME, 'project-summary')
    for summary in reversed(summaries):
        shadow = mgr.expand_shadow_element(summary)
        title = mgr.find_shadow_tree_element(shadow, By.TAG_NAME, 'h2')
        if title.get_attribute('textContent') == name:
            link = mgr.find_shadow_tree_element(shadow, By.TAG_NAME, 'a')
            href = link.get_attribute('href')
            project_id = href.split('/')[-2]
            break
    yield project_id

@pytest.fixture(scope='session')
def video_section(request, browser, project):
    print("Creating video section...")
    host = request.config.option.host
    browser.get(f"{host}/{project}/project-detail")
    time.sleep(1)
    mgr = ShadowManager(browser)
    # Click add folder button
    buttons = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'button')
    found = False
    for button in buttons:
        if 'Add folder' in button.get_attribute('textContent'):
            found = True
            break
    assert(found)
    button.click()
    time.sleep(1)
    # Enter name
    name_dialog = mgr.find_shadow_tree_element(browser, By.TAG_NAME, 'name-dialog')
    browser.save_screenshot('/home/jon/test.png')
    shadow = mgr.expand_shadow_element(name_dialog)
    field = mgr.find_shadow_tree_element(shadow, By.TAG_NAME, 'input')
    footer = mgr.find_shadow_tree_elements(shadow, By.TAG_NAME, 'button')
    field.send_keys('Videos')
    for button in footer:
        if button.get_attribute('textContent') == 'Save':
            button.click()
    time.sleep(1)
    # Select the new section
    cards = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'section-card')
    found = False
    for card in cards:
        shadow = mgr.expand_shadow_element(card)
        h2 = mgr.find_shadow_tree_element(shadow, By.TAG_NAME, 'h2')
        if h2.get_attribute('textContent') == 'Videos':
            found = True
            card.click()
            break
    assert(found)
    time.sleep(1)
    # Get section ID from URL
    url = browser.current_url
    section = int(url.split('=')[-1])
    yield section

@pytest.fixture(scope='session')
def image_set(request):
    print("Getting image files...")
    out_path = '/tmp/lfw.tgz'
    extract_path = '/tmp/lfw'

    # Download Labeled Faces in the Wild dataset.
    if not os.path.exists(out_path):
        url = 'http://vis-www.cs.umass.edu/lfw/lfw.tgz'
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

    # Extract the images.
    if not os.path.exists(extract_path):
        os.makedirs(extract_path, exist_ok=True)
        tar = tarfile.open(out_path)
        for item in tar:
            tar.extract(item, extract_path)

    image_path = os.path.join(extract_path, 'lfw')
    yield image_path
    shutil.rmtree(extract_path)

@pytest.fixture(scope='session')
def video_file(request):
    print("Getting video file...")
    out_path = '/tmp/AudioVideoSyncTest_BallastMedia.mp4'
    if not os.path.exists(out_path):
        url = 'http://www.ballastmedia.com/wp-content/uploads/AudioVideoSyncTest_BallastMedia.mp4'
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
    yield out_path

@pytest.fixture(scope='session')
def video(request, browser, project, video_section, video_file):
    print("Uploading a video...")
    host = request.config.option.host
    browser.get(f"{host}/{project}/project-detail?section={video_section}")
    time.sleep(1)
    mgr = ShadowManager(browser)
    upload = mgr.find_shadow_tree_element(browser, By.TAG_NAME, 'section-upload')
    shadow = mgr.expand_shadow_element(upload)
    upload = mgr.find_shadow_tree_element(shadow, By.TAG_NAME, 'input')
    local_path = f"{os.getenv('HOME')}/AudioVideoSyncTest_BallastMedia.mp4"
    shutil.copyfile(video_file, local_path)
    upload.send_keys(local_path)
    # Close upload dialog
    time.sleep(2)
    dialog = mgr.find_shadow_tree_element(browser, By.TAG_NAME, 'upload-dialog')
    shadow = mgr.expand_shadow_element(dialog)
    close = mgr.find_shadow_tree_element(shadow, By.CLASS_NAME, 'btn-purple')
    close.click()
    # Find soft reload button
    soft_reload = mgr.find_shadow_tree_element(browser, By.TAG_NAME, 'reload-button')
    for _ in range(30):
        time.sleep(10)
        soft_reload.click()
        media_cards = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'media-card')
        if len(media_cards) == 1:
            break
    videos = [int(media_card.get_attribute('media-id')) for media_card in media_cards]
    yield videos

