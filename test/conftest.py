import os
import shutil
import time
import datetime
import subprocess
import tarfile
import shutil

import pytest
import requests

def pytest_addoption(parser):
    parser.addoption('--username', help='Username for login page.')
    parser.addoption('--password', help='Password for login page.')
    parser.addoption('--screenshots', help='Directory to store screenshots.')
    parser.addoption('--keep', help='Do not delete project when done', action='store_true')

def pytest_generate_tests(metafunc):
    if 'username' in metafunc.fixturenames:
          metafunc.parametrize('username', [metafunc.config.getoption('username')])
    if 'password' in metafunc.fixturenames:
          metafunc.parametrize('password', [metafunc.config.getoption('password')])

@pytest.fixture(scope='session')
def screenshots(request):
    """ Directory created to store screenshots. """
    screenshots = request.config.option.screenshots
    os.makedirs(screenshots, exist_ok=True)
    yield screenshots

@pytest.fixture(scope='session')
def authenticated(request, base_url, browser_type, browser_type_launch_args, browser_context_args):
    """ Yields a persistent logged in context. """
    print("Logging in...")
    username = request.config.option.username
    password = request.config.option.password
    context = browser_type.launch_persistent_context("./foobar", **{
        **browser_type_launch_args,
        **browser_context_args,
        "base_url": base_url,
        "locale": "en-US",
    })
    page = context.new_page()
    page.goto('/')
    page.wait_for_url('/accounts/login/')
    page.fill('input[name="username"]', username)
    page.fill('input[name="password"]', password)
    page.click('input[type="submit"]')
    page.wait_for_url('/projects/')
    yield context
    context.close()
    shutil.rmtree("./foobar")

@pytest.fixture(scope='session')
def token(request, authenticated):
    """ Token obtained via the API Token page. """
    print("Getting token...")
    username = request.config.option.username
    password = request.config.option.password
    page = authenticated.new_page()
    page.goto('/token')
    page.fill('input[type="text"]', username)
    page.fill('input[type="password"]', password)
    page.click('input[type="submit"]')
    page.wait_for_selector('text=/^.{40}$/')
    token = page.text_content('modal-notify p')
    assert(len(token) == 40)
    yield token

@pytest.fixture(scope='session')
def project(request, authenticated, base_url, token):
    """ Project created with setup_project.py script, all options enabled. """
    print("Creating test project with setup_project.py...")
    current_dt = datetime.datetime.now()
    dt_str = current_dt.strftime('%Y_%m_%d__%H_%M_%S')
    name = f"test_front_end_{dt_str}"
    cmd = [
        'python3',
        'scripts/packages/tator-py/examples/setup_project.py',
        '--host', base_url,
        '--token', token,
        '--name', name,
        '--create-state-latest',
        '--create-state-range-type',
        '--create-track-type',
    ]
    subprocess.run(cmd, check=True)

    page = authenticated.new_page()
    page.goto('/projects')
    page.wait_for_selector(f'text="{name}"')
    summaries = page.query_selector_all('project-summary')
    for summary in reversed(summaries):
        if summary.query_selector('h2').text_content() == name:
            link = summary.query_selector('a')
            href = link.get_attribute('href')
            project_id = int(href.split('/')[-2])
            break
    yield project_id

@pytest.fixture(scope='session')
def video_section(request, authenticated, project):
    print("Creating video section...")
    page = authenticated.new_page()
    page.goto(f'{project}/project-detail')
    page.click('text="Add folder"')
    page.fill('name-dialog input', 'Videos')
    page.click('text="Save"')
    page.click('text="Videos"')
    section = int(page.url.split('=')[-1])
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

"""
@pytest.fixture(scope='session')
def video(request, browser, project, video_section, video_file):
    print("Uploading a video...")
    go_to_uri(browser, f"{project}/project-detail?section={video_section}")
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
    for _ in range(8):
        time.sleep(15)
        soft_reload.click()
        media_cards = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'media-card')
        if len(media_cards) == 0:
            continue
        shadow = mgr.expand_shadow_element(media_cards[0])
        a = mgr.find_shadow_tree_element(shadow, By.TAG_NAME, 'a')
        href = a.get_attribute('href')
        if 'annotation' in href:
            print(f"Media card has href {href}, media is ready...")
            break
    video = int(media_cards[0].get_attribute('media-id'))
    yield video
"""
