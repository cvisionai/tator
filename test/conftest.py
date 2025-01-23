import os
import shutil
import datetime
import subprocess
import tarfile
import pytest
import inspect
import time

import tator

from ._common import download_file, create_media, upload_media_file

class PageFactory:
    def __init__(self, browser, browser_context_args, storage, base_path):
        self.browser = browser
        self.browser_context_args = browser_context_args
        self.storage = storage
        self.base_path = base_path
        self._logs = []

    def __call__(self, test_name):
        artifact_path = os.path.join(self.base_path, test_name)
        os.makedirs(artifact_path, exist_ok=True)
        page = self.browser.new_page(
            **self.browser_context_args,
            record_video_dir=artifact_path,
            record_har_path=os.path.join(artifact_path, 'har.json'),
            locale='en-us',
            storage_state=self.storage,
        )
        log_path = os.path.join(artifact_path, 'console.txt')
        self._logs.append(open(log_path, 'w'))
        page.on("console", lambda msg: self._logs[-1].write(f"{msg.location['url']} line "
                                                            f"{msg.location['lineNumber']} col "
                                                            f"{msg.location['columnNumber']} ("
                                                            f"{msg.type}): {msg.text}\n"))
        return page

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
def chrome(browser_type, browser_type_launch_args):
    yield browser_type.launch(
        **browser_type_launch_args,
        executable_path="/usr/bin/google-chrome",
    )

@pytest.fixture(scope='session')
def authenticated(request, launch_time, base_url, chrome, browser_context_args):
    """ Yields a persistent logged in context. """
    print("Logging in...")
    username = request.config.option.username
    password = request.config.option.password
    videos = os.path.join(request.config.option.videos, launch_time, f'{os.path.basename(__file__)}__test_login')
    os.makedirs(videos, exist_ok=True)
    context = chrome.new_context(
        **browser_context_args,
        record_video_dir=videos,
        record_video_size={"width": 1920, "height": 1080},
        viewport={"width": 2560, "height": 1440},
        locale="en-US",
    )
    page = context.new_page()
    page.goto('/', wait_until='networkidle')
    page.wait_for_url('/accounts/login/*')
    page.fill('input[name="username"]', username)
    page.fill('input[name="password"]', password)
    page.click('input[type="submit"]')
    page.wait_for_url('/projects')
    yield context
    context.close()

@pytest.fixture(scope='session')
def page_factory(request, launch_time, base_url, chrome, browser_context_args, authenticated):
    base_path = os.path.join(request.config.option.videos, launch_time)
    storage = authenticated.storage_state(path="/tmp/state.json")
    yield PageFactory(chrome, browser_context_args, storage, base_path)

@pytest.fixture(scope='session')
def token(request, page_factory):
    """ Token obtained via the API Token page. """
    print("Getting token...")
    username = request.config.option.username
    password = request.config.option.password
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto('/token', wait_until='networkidle')
    page.fill('input[type="text"]', username)
    page.fill('input[type="password"]', password)
    page.click('input[type="submit"]')
    page.wait_for_selector('text=Your API token is:')
    token = page.text_content('modal-notify .modal__main p')
    page.close()
    assert(len(token) == 40)
    yield token

@pytest.fixture(scope='session')
def project(request, page_factory, launch_time, base_url, token):
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

    page = page_factory(f'{os.path.basename(__file__)}__token')
    page.goto('/projects', wait_until='networkidle')
    page.wait_for_selector(f'text="{name}"')
    summaries = page.query_selector_all('project-summary')
    for summary in reversed(summaries):
        if summary.query_selector('h2').text_content() == name:
            link = summary.query_selector('a')
            href = link.get_attribute('href')
            project_id = int(href.split('/')[-2])
            break
    page.close()
    yield project_id

@pytest.fixture(scope='session')
def video_section(request, page_factory, project):
    print("Creating video section...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f'/{project}/project-detail', wait_until='networkidle')
    page.click('div[tooltip="Add Folder"]')
    page.fill('folder-dialog text-input[name="Folder Name:"] input', 'Videos')
    page.select_option('folder-dialog enum-input[name="Parent Folder:"] select', label='-- None --')
    page.click('text="Add"')
    page.click('text="Videos"')
    section = int(page.url.split('=')[-1])
    page.close()
    yield section

@pytest.fixture(scope='session')
def slow_video_section(request, page_factory, project):
    print("Creating video section...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f'/{project}/project-detail', wait_until='networkidle')
    page.click('div[tooltip="Add Folder"]')
    page.fill('folder-dialog text-input[name="Folder Name:"] input', 'Slow Videos')
    page.select_option('folder-dialog enum-input[name="Parent Folder:"] select', label='-- None --')
    page.click('text="Add"')
    page.click('text="Slow Videos"')
    section = int(page.url.split('=')[-1])
    page.close()
    yield section

@pytest.fixture(scope='session')
def video_section2(request, page_factory, project):
    print("Creating video section...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f'/{project}/project-detail', wait_until='networkidle')
    page.click('div[tooltip="Add Folder"]')
    page.fill('folder-dialog text-input[name="Folder Name:"] input', 'Videos 2')
    page.select_option('folder-dialog enum-input[name="Parent Folder:"] select', label='-- None --')
    page.click('text="Add"')
    page.click('text="Videos 2"')
    section = int(page.url.split('=')[-1])
    page.close()
    yield section

@pytest.fixture(scope='session')
def video_section3(request, page_factory, project):
    print("Creating video section...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f'/{project}/project-detail', wait_until='networkidle')
    page.click('div[tooltip="Add Folder"]')
    page.fill('folder-dialog text-input[name="Folder Name:"] input', 'Videos 3')
    page.select_option('folder-dialog enum-input[name="Parent Folder:"] select', label='-- None --')
    page.click('text="Add"')
    page.click('text="Videos 3"')
    section = int(page.url.split('=')[-1])
    page.close()
    yield section

@pytest.fixture(scope='session')
def image_section(request, page_factory, project):
    print("Creating image section...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f'/{project}/project-detail', wait_until='networkidle')
    page.click('div[tooltip="Add Folder"]')
    page.fill('folder-dialog text-input[name="Folder Name:"] input', 'Images')
    page.select_option('folder-dialog enum-input[name="Parent Folder:"] select', label='-- None --')
    page.click('text="Add"')
    page.click('text="Images"')
    section = int(page.url.split('=')[-1])
    page.close()
    yield section

@pytest.fixture(scope='session')
def image_section1(request, page_factory, project):
    print("Creating image section...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f'/{project}/project-detail', wait_until='networkidle')
    page.click('div[tooltip="Add Folder"]')
    page.fill('folder-dialog text-input[name="Folder Name:"] input', 'Images 1')
    page.select_option('folder-dialog enum-input[name="Parent Folder:"] select', label='-- None --')
    page.click('text="Add"')
    page.click('text="Images 1"')
    section = int(page.url.split('=')[-1])
    page.close()
    yield section

@pytest.fixture(scope='session')
def image_set(request):
    print("Getting image files...")
    out_path = '/tmp/lfw.tgz'
    extract_path = '/tmp/lfw'

    # Download Labeled Faces in the Wild dataset.
    if not os.path.exists(out_path):
        url = 'https://s3.amazonaws.com/tator-ci/lfw.tgz'
        subprocess.run(['wget', '-O', out_path, url], check=True)

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
        url = 'https://s3.amazonaws.com/tator-ci/AudioVideoSyncTest_BallastMedia.mp4'
        subprocess.run(['wget', '-O', out_path, url], check=True)
    yield out_path

@pytest.fixture(scope='session')
def video(request, page_factory, project, video_section, video_file):
    print("Uploading a video...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-detail?section={video_section}", wait_until='networkidle')
    page.wait_for_selector('section-upload')
    page.set_input_files('section-upload input', video_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.locator('.project__header reload-button').click()
        page.wait_for_load_state('networkidle')
        cards = page.query_selector_all('entity-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    video = int(cards[0].get_attribute('media-id'))
    page.close()
    yield video

@pytest.fixture(scope='session')
def slow_video_file(request, video_file):
    print("Getting video file...")
    in_path = video_file
    out_path = '/tmp/AudioVideoSyncTest_slow.mp4'
    subprocess.run(["ffmpeg", "-y", "-i", in_path, "-r", "5", out_path])
    yield out_path

@pytest.fixture(scope='session')
def slow_video(request, page_factory, project, slow_video_section, slow_video_file):
    print("Uploading a video...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-detail?section={slow_video_section}", wait_until='networkidle')
    page.wait_for_selector('section-upload')
    page.set_input_files('section-upload input', slow_video_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.locator('.project__header reload-button').click()
        page.wait_for_load_state('networkidle')
        cards = page.query_selector_all('entity-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    video = int(cards[0].get_attribute('media-id'))
    page.close()
    yield video

@pytest.fixture(scope='session')
def video2(request, page_factory, project, video_section2, video_file):
    print("Uploading a video...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-detail?section={video_section2}", wait_until='networkidle')
    page.wait_for_selector('section-upload')
    page.set_input_files('section-upload input', video_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.locator('.project__header reload-button').click()
        page.wait_for_load_state('networkidle')
        cards = page.query_selector_all('entity-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    video = int(cards[0].get_attribute('media-id'))
    page.close()
    yield video

@pytest.fixture(scope='session')
def video3(request, page_factory, project, video_section3, video_file):
    print("Uploading a video...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-detail?section={video_section3}", wait_until='networkidle')
    page.wait_for_selector('section-upload')
    page.set_input_files('section-upload input', video_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.locator('.project__header reload-button').click()
        page.wait_for_load_state('networkidle')
        cards = page.query_selector_all('entity-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    video = int(cards[0].get_attribute('media-id'))
    page.close()
    yield video

@pytest.fixture(scope='session')
def multi(request, base_url, token, project, video2, video3):
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    multi_types = [m for m in media_types if m.dtype == "multi"]
    multi_type_id = multi_types[0]
    response = tator.util.make_multi_stream(api, multi_type_id.id, [1,2], "test.multi",[video2,video3], "Multis")
    yield response.id[0]

@pytest.fixture(scope='session')
def image_file(request):
    out_path = '/tmp/test1.jpg'
    if not os.path.exists(out_path):
        url = 'https://s3.amazonaws.com/tator-ci/landscape.jpg'
        subprocess.run(['wget', '-O', out_path, url], check=True)
    yield out_path

@pytest.fixture(scope='session')
def image(request, page_factory, project, image_section, image_file):
    print("Uploading an image...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-detail?section={image_section}", wait_until='networkidle')
    page.wait_for_selector('section-upload')
    page.set_input_files('section-upload input', image_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.locator('.project__header reload-button').click()
        page.wait_for_load_state('networkidle')
        cards = page.query_selector_all('entity-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    image = int(cards[0].get_attribute('media-id'))
    page.close()
    yield image


@pytest.fixture(scope='session')
def referenced_image(request, base_url, token, page_factory, project, image_section):
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    image_type = None
    for m in reversed(media_types):
        if m.dtype == "image":
            image_type = m
            break
    media_spec = {'type': image_type.id,
                  'section': "Referenced Image",
                  'name': 'Referenced Image.jpg',
                  'url': 'https://s3.amazonaws.com/tator-ci/landscape.jpg',
                  'md5': tator.util.md5sum('https://s3.amazonaws.com/tator-ci/landscape.jpg'),
                  'width': 550,
                  'height': 368,
                  'reference_only': 1
                  }
    response = api.create_media_list(project, [media_spec])
    media_resp = api.get_media(response.id[0]).to_dict()
    attempts = 0
    def is_image_ready(media_resp):
        if media_resp["media_files"] is None:
            return False
        if media_resp["media_files"].get("image", []) == None:
            return False
        if len(media_resp["media_files"].get("image", [])) < 1:
            return False
        else:
            return True

    while (not is_image_ready(media_resp)) and attempts < 30:
        print(f"Waiting for async image job {attempts+1}/30")
        media_resp = api.get_media(response.id[0]).to_dict()
        time.sleep(1)
        attempts += 1
    yield response.id[0]

@pytest.fixture(scope='session')
def referenced_video(request, base_url, token, page_factory, project):
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    video_type = None
    for m in reversed(media_types):
        if m.dtype == "video":
            video_type = m
            break
    media_spec = {'type': video_type.id,
                  'section': "Referenced Image",
                  'name': 'Referenced Image.jpg',
                  'md5': tator.util.md5sum('https://s3.amazonaws.com/tator-ci/count.mp4'),
                  'width': 720,
                  'height': 720,
                  'num_frames': 999,
                  'fps': 30.0
                  }
    response = api.create_media_list(project, [media_spec])
    media_id = response.id[0]
    video_def = {
        'codec': 'h264',
        'codec_description': 'H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10',
        'size': 249033,
        'bit_rate': 56393,
        'resolution': [720,720],
        'path': 'https://s3.amazonaws.com/tator-ci/count.mp4',
        'segment_info': 'https://s3.amazonaws.com/tator-ci/count.json',
        'reference_only': 1,
    }
    api.create_video_file(media_id, role='streaming', video_definition=video_def)
    yield media_id

@pytest.fixture(scope='session')
def image1(request, page_factory, project, image_section1, image_file):
    print("Uploading an image...")
    page = page_factory(f"{os.path.basename(__file__)}__{inspect.stack()[0][3]}")
    page.goto(f"/{project}/project-detail?section={image_section1}", wait_until='networkidle')
    page.wait_for_selector('section-upload')
    page.set_input_files('section-upload input', image_file)
    page.query_selector('upload-dialog').query_selector('text=Close').click()
    while True:
        page.locator('.project__header reload-button').click()
        page.wait_for_load_state('networkidle')
        cards = page.query_selector_all('entity-card')
        if len(cards) == 0:
            continue
        href = cards[0].query_selector('a').get_attribute('href')
        if 'annotation' in href:
            print(f"Card href is {href}, media is ready...")
            break
    image = int(cards[0].get_attribute('media-id'))
    page.close()
    yield image

@pytest.fixture(scope='session')
def yaml_file(request):
    out_path = '/tmp/TEST.yaml'
    if not os.path.exists(out_path):
        with open(out_path, 'w+') as f:
            f.write("test")
    yield out_path

@pytest.fixture(scope='session')
def html_file(request):
    out_path = '/tmp/applet-test.yaml'
    if not os.path.exists(out_path):
        with open(out_path, 'w+') as f:
            f.write("<html><head></head><body><h1>HTML FILE</h1></body></html>")
    yield out_path

@pytest.fixture(scope='session')
def video_files(request):
    files = ["https://github.com/cvisionai/rgb_test_videos/raw/v0.0.2/samples/FF0000.mp4",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.2/samples/FF0000.json",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.2/samples/00FF00.mp4",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.2/samples/00FF00.json",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.2/samples/0000FF.mp4",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.2/samples/0000FF.json",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.3/samples/count.mp4",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.3/samples/count.json",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.3/samples/count_360.mp4",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.3/samples/count_360.json",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.4/samples/count_1fps.mp4",
             "https://github.com/cvisionai/rgb_test_videos/raw/v0.0.4/samples/count_1fps.json"]
    for fp in files:
        dst = os.path.join("/tmp",os.path.basename(fp))
        download_file(fp, dst)

@pytest.fixture(scope='session')
def rgb_test(request, base_url, project, token, video_files):
    red_mp4="/tmp/FF0000.mp4"
    red_segments="/tmp/FF0000.json"
    green_mp4="/tmp/00FF00.mp4"
    green_segments="/tmp/00FF00.json"
    blue_mp4="/tmp/0000FF.mp4"
    blue_segments="/tmp/0000FF.json"
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    video_types = [m for m in media_types if m.dtype == "video"]
    video_type_id = video_types[0].id

    media_id = create_media(api, project, base_url, token, video_type_id, "color_check.mp4", "Color Check Video", red_mp4)
    colors=[red_mp4, green_mp4, blue_mp4]
    segments=[red_segments, green_segments, blue_segments]
    for color,segment in zip(colors, segments):
        upload_media_file(api, project, media_id, color, segment)
    yield media_id

@pytest.fixture(scope='session')
def rgb_test_2(request, base_url, project, token, video_files):
    
    red_mp4="/tmp/FF0000.mp4"
    red_segments="/tmp/FF0000.json"
    green_mp4="/tmp/00FF00.mp4"
    green_segments="/tmp/00FF00.json"
    blue_mp4="/tmp/0000FF.mp4"
    blue_segments="/tmp/0000FF.json"
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    video_types = [m for m in media_types if m.dtype == "video"]
    video_type_id = video_types[0].id

    media_id = create_media(api, project, base_url, token, video_type_id, "color_check.mp4", "Color Check Video", red_mp4)
    colors=[red_mp4, green_mp4, blue_mp4]
    segments=[red_segments, green_segments, blue_segments]
    for color,segment in zip(colors, segments):
        upload_media_file(api, project, media_id, color, segment)
    yield media_id

@pytest.fixture(scope='session')
def multi_rgb(request, base_url, token, project, rgb_test, rgb_test_2):
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    multi_types = [m for m in media_types if m.dtype == "multi"]
    multi_type_id = multi_types[0]
    response = tator.util.make_multi_stream(api, multi_type_id.id, [1,2], "test.multi",[rgb_test,rgb_test_2], "Multis")
    yield response.id[0]

@pytest.fixture(scope='session')
def small_video(request, base_url, project, token, video_files):
    blue_mp4="/tmp/0000FF.mp4"
    blue_segments="/tmp/0000FF.json"

    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    video_types = [m for m in media_types if m.dtype == "video"]
    video_type_id = video_types[0].id

    media_id = create_media(api, project, base_url, token, video_type_id, "color_check.mp4", "Color Check Video", blue_mp4)
    colors=[blue_mp4]
    segments=[blue_segments]
    for color,segment in zip(colors, segments):
        upload_media_file(api, project, media_id, color, segment)
    yield media_id

@pytest.fixture(scope='session')
def count_test(request, base_url, project, token, video_files):
    count_mp4="/tmp/count.mp4"
    count_segments="/tmp/count.json"
    count_360_mp4="/tmp/count_360.mp4"
    count_360_segments="/tmp/count_360.json"

    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    video_types = [m for m in media_types if m.dtype == "video"]
    video_type_id = video_types[0].id

    # Get the file size of the mp4 file
    file_size = os.path.getsize(count_mp4)

    colors=[count_mp4, count_360_mp4]
    segments=[count_segments, count_360_segments]
    media_id = create_media(api, project, base_url, token, video_type_id, "count_check.mp4", "Counts", count_mp4)
    # Ensure it uploads in multiple chunks to verify multipart uploads
    for color,segment in zip(colors, segments):
        upload_media_file(api, project, media_id, color, segment, chunk_size=file_size / 10)
    yield media_id

@pytest.fixture(scope='session')
def count_1fps_test(request, base_url, project, token, video_files):
    count_mp4="/tmp/count_1fps.mp4"
    count_segments="/tmp/count_1fps.json"

    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    video_types = [m for m in media_types if m.dtype == "video"]
    video_type_id = video_types[0].id

    colors=[count_mp4]
    segments=[count_segments]
    media_id = create_media(api, project, base_url, token, video_type_id, "count_1fps_check.mp4", "Counts", count_mp4)
    for color,segment in zip(colors, segments):
        upload_media_file(api, project, media_id, color, segment)
    yield media_id

@pytest.fixture(scope='session')
def count_test_2(request, base_url, project, token, video_files):
    count_mp4="/tmp/count.mp4"
    count_segments="/tmp/count.json"
    count_360_mp4="/tmp/count_360.mp4"
    count_360_segments="/tmp/count_360.json"

    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    video_types = [m for m in media_types if m.dtype == "video"]
    video_type_id = video_types[0].id

    colors=[count_mp4, count_360_mp4]
    segments=[count_segments, count_360_segments]
    media_id = create_media(api, project, base_url, token, video_type_id, "count_check.mp4", "Counts", count_mp4)
    for color,segment in zip(colors, segments):
        upload_media_file(api, project, media_id, color, segment)
    yield media_id

@pytest.fixture(scope='session')
def multi_count(request, base_url, token, project, count_test, count_test_2):
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    multi_types = [m for m in media_types if m.dtype == "multi"]
    multi_type_id = multi_types[0]
    response = tator.util.make_multi_stream(api, multi_type_id.id, [1,2], "test.multi",[count_test,count_test_2], "Multis")
    yield response.id[0]

@pytest.fixture(scope='session')
def multi_offset_count(request, base_url, token, project, count_test, count_test_2):
    api = tator.get_api(host=base_url, token=token)
    media_types = api.get_media_type_list(project)
    multi_types = [m for m in media_types if m.dtype == "multi"]
    multi_type_id = multi_types[0]
    response = tator.util.make_multi_stream(api, multi_type_id.id, [1,2], "test_offset.multi",[count_test,count_test_2], "Multis")
    api.update_media(response.id[0], {'multi': {'frameOffset': [0,100]}})
    yield response.id[0]

@pytest.fixture(scope='session')
def concat_test(request, base_url, token, project, rgb_test, rgb_test_2):
    api = tator.get_api(host=base_url, token=token)
    response = tator.util.make_concat(api, "test_concat",[rgb_test,rgb_test_2], "Concat")
    yield response.id[0]
