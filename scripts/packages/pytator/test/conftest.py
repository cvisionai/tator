import datetime
import os

import pytest
import requests

def pytest_addoption(parser):
    parser.addoption('--url', help='URL to rest service', default='https://adamant.duckdns.org/rest')
    parser.addoption('--token', help='API token', default='')

def pytest_generate_tests(metafunc):
    if 'url' in metafunc.fixturenames:
          metafunc.parametrize('url', [metafunc.config.getoption('url')])
    if 'token' in metafunc.fixturenames:
          metafunc.parametrize('token', [metafunc.config.getoption('token')])

def make_attribute_types():
    return [
        dict(
            name='test_bool',
            dtype='bool',
            default=True,
        ),
        dict(
            name='test_int',
            dtype='int',
            default=0,
            minimum=-1000,
            maximum=1000,
        ),
        dict(
            name='test_float',
            dtype='float',
            default=0.0,
            minimum=-1000.0,
            maximum=1000.0,
        ),
        dict(
            name='test_enum',
            dtype='enum',
            choices=['a', 'b', 'c'],
            default='a',
        ),
        dict(
            name='test_string',
            dtype='string',
            default='asdf',
        ),
        dict(
            name='test_datetime',
            dtype='datetime',
            use_current=True,
        ),
        dict(
            name='test_geopos',
            dtype='geopos',
            default=[-179.0, -89.0],
        ),
    ]

@pytest.fixture(scope='session')
def project(request):
    """ Project ID for a created project. """
    import pytator
    url = request.config.option.url
    token = request.config.option.token
    tator = pytator.Tator(url, token, None)
    current_dt = datetime.datetime.now()
    dt_str = current_dt.strftime('%Y_%m_%d__%H_%M_%S')
    status, response = tator.Project.new({
        'name': f'test_project_{dt_str}',
        'summary': f'Test project created by pytator unit tests on {current_dt}',
    })
    project_id = response['id']
    yield project_id
    status = tator.Project.delete(project_id)

@pytest.fixture(scope='session')
def video_type(request, project):
    import pytator
    url = request.config.option.url
    token = request.config.option.token
    tator = pytator.Tator(url, token, project)
    status, response = tator.MediaType.new({
        'name': 'video_type',
        'description': 'Test video type',
        'project': project,
        'dtype': 'video',
    })
    video_type_id = response['id']
    yield video_type_id
    status = tator.MediaType.delete(video_type_id)

@pytest.fixture(scope='session')
def video(request, project, video_type):
    import pytator
    url = request.config.option.url
    token = request.config.option.token
    tator = pytator.Tator(url, token, project)
    out_path = '/tmp/ForBiggerEscapes.mp4'
    if not os.path.exists(out_path):
        url = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
    video_id = tator.Media.uploadFile(video_type, out_path)
    yield video_id
    status = tator.MediaType.delete(video_id)

@pytest.fixture(scope='session')
def box_type(request, project, video_type):
    import pytator
    url = request.config.option.url
    token = request.config.option.token
    tator = pytator.Tator(url, token, project)
    status, response = tator.LocalizationType.new({
        'name': 'box_type',
        'description': 'Test box type',
        'project': project,
        'media_types': [video_type],
        'dtype': 'box',
        'attribute_types': make_attribute_types(),
    })
    box_type_id = response['id']
    yield box_type_id
    status = tator.LocalizationType.delete(box_type_id)

@pytest.fixture(scope='session')
def state_type(request, project, video_type):
    import pytator
    url = request.config.option.url
    token = request.config.option.token
    tator = pytator.Tator(url, token, project)
    status, response = tator.StateType.new({
        'name': 'state_type',
        'description': 'Test state type',
        'project': project,
        'media_types': [video_type],
        'association': 'Frame',
        'attribute_types': make_attribute_types(),
    })
    state_type_id = response['id']
    yield state_type_id
    status = tator.StateType.delete(state_type_id)

@pytest.fixture(scope='session')
def track_type(request, project, video_type):
    import pytator
    url = request.config.option.url
    token = request.config.option.token
    tator = pytator.Tator(url, token, project)
    status, response = tator.StateType.new({
        'name': 'track_type',
        'description': 'Test track type',
        'project': project,
        'media_types': [video_type],
        'association': 'Localization',
        'attribute_types': make_attribute_types(),
    })
    state_type_id = response['id']
    yield state_type_id
    status = tator.StateType.delete(state_type_id)
