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
    })
    state_type_id = response['id']
    yield state_type_id
    status = tator.StateType.delete(state_type_id)

def make_attribute_types(request, project, type_id):
    """ Dict of attribute type ids applied to a box type, one for each dtype. """
    import pytator
    url = request.config.option.url
    token = request.config.option.token
    tator = pytator.Tator(url, token, project)
    attribute_type_ids = {}
    dtypes = ['bool', 'int', 'float', 'str', 'enum', 'datetime', 'geopos']
    for order, dtype in enumerate(dtypes):
        aux = {}
        if dtype == 'bool':
            aux = {'default': True}
        elif dtype == 'int':
            aux = {'default': 0, 'lower_bound': -1000, 'upper_bound': 1000}
        elif dtype == 'float':
            aux = {'default': 0.0, 'lower_bound': -1000, 'upper_bound': 1000}
        elif dtype == 'str':
            aux = {'default': 'asdf'}
        elif dtype == 'enum':
            aux = {'choices': ['a', 'b', 'c'], 'default': 'a'}
        elif dtype == 'datetime':
            aux = {'use_current': True}
        elif dtype == 'geopos':
            aux = {'default': [-179.0, -89.0]}
        status, response = tator.AttributeType.new({
            'name': f'test_{dtype}',
            'description': 'Test box type',
            'project': project,
            'applies_to': type_id,
            'dtype': dtype,
            'order': order,
            **aux,
        })
        attribute_type_ids[dtype] = response['id']
    yield attribute_type_ids
    for dtype in attribute_type_ids:
        status = tator.AttributeType.delete(attribute_type_ids[dtype])

@pytest.fixture(scope='session')
def box_attribute_types(request, project, box_type):
    yield from make_attribute_types(request, project, box_type)
    
@pytest.fixture(scope='session')
def state_attribute_types(request, project, state_type):
    yield from make_attribute_types(request, project, state_type)
