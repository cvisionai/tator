import os
import shutil
import time
import datetime
import subprocess
import tarfile
import shutil

import pytest
import requests

from ._common import get_video_path

def pytest_addoption(parser):
    parser.addoption('--username', help='Username for login page.')
    parser.addoption('--password', help='Password for login page.')
    parser.addoption('--videos', help='Directory to store videos.')
    parser.addoption('--keep', help='Do not delete project when done', action='store_true')

def pytest_generate_tests(metafunc):
    if 'username' in metafunc.fixturenames:
          metafunc.parametrize('username', [metafunc.config.getoption('username')])
    if 'password' in metafunc.fixturenames:
          metafunc.parametrize('password', [metafunc.config.getoption('password')])

@pytest.fixture(scope='session')
def launch_time(request):
    current_dt = datetime.datetime.now()
    dt_str = current_dt.strftime('%Y_%m_%d__%H_%M_%S')
    yield dt_str

@pytest.fixture(scope='session')
def authenticated(request, launch_time, base_url, browser_type, browser_type_launch_args,
                  browser_context_args):
    """ Yields a persistent logged in context. """
    print("Logging in...")
    username = request.config.option.username
    password = request.config.option.password
    videos = os.path.join(request.config.option.videos, launch_time)
    if os.path.exists("foobar"):
        shutil.rmtree("foobar")
    context = browser_type.launch_persistent_context("./foobar", **{
        **browser_type_launch_args,
        **browser_context_args,
        "base_url": base_url,
        "record_video_dir": videos,
        "locale": "en-US",
        "executable_path": "/usr/bin/google-chrome",
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
def project(request, authenticated, launch_time, base_url, token):
    """ Project created with setup_project.py script, all options enabled. """
    print("Creating test project with setup_project.py...")
    name = f"test_front_end_{launch_time}"
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
    page.goto(f'/{project}/project-detail')
    page.click('text="Add folder"')
    page.fill('name-dialog input', 'Videos')
    page.click('text="Save"')
    page.click('text="Videos"')
    section = int(page.url.split('=')[-1])
    yield section

@pytest.fixture(scope='session')
def image_section(request, authenticated, project):
    print("Creating image section...")
    page = authenticated.new_page()
    page.goto(f'/{project}/project-detail')
    page.click('text="Add folder"')
    page.fill('name-dialog input', 'Images')
    page.click('text="Save"')
    page.click('text="Images"')
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

@pytest.fixture(scope='session')
def video(request, authenticated, project, video_section, video_file):
    print("Uploading a video...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-detail?section={video_section}")
    page.set_input_files('section-upload input', video_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.click('reload-button')
        cards = page.query_selector_all('media-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    video = int(cards[0].get_attribute('media-id'))
    yield video

@pytest.fixture(scope='session')
def image_file(request):
    out_path = '/tmp/test1.jpg'
    if not os.path.exists(out_path):
        url = 'https://www.gstatic.com/webp/gallery/1.jpg'
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
    yield out_path

@pytest.fixture(scope='session')
def image(request, authenticated, project, image_section, image_file):
    print("Uploading an image...")
    page = authenticated.new_page()
    page.goto(f"/{project}/project-detail?section={image_section}")
    page.set_input_files('section-upload input', image_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.click('reload-button')
        cards = page.query_selector_all('media-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    image = int(cards[0].get_attribute('media-id'))
    yield image

@pytest.fixture(scope='session')
def yaml_file(request):
    out_path = '/tmp/TEST.yaml'
    if not os.path.exists(out_path):
        with open(out_path, 'w+') as f:
            f.write("test")
    yield out_path