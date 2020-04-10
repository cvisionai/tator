import pytest
import datetime

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
    tator = pytator.Tator(url, token, project_id)
    user = tator.whoami()
    user_id = user['id']
    print(f"USER: {user}")
    status, response = tator.Membership.new({
        'user': user_id,
        'project': project_id,
        'permission': 'a',
    })
    yield project_id
    status = tator.Project.delete(project_id)

