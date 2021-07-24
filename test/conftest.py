import time
import datetime
import subprocess

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
    host = request.config.option.host
    username = request.config.option.username
    password = request.config.option.password
    keep = request.config.option.keep
    options = Options()
    options.headless = True
    browser = webdriver.Chrome(options=options)
    browser.get(host)
    time.sleep(2)
    assert(browser.current_url.endswith('/accounts/login/'))
    mgr = ShadowManager(browser)
    username_input = mgr.find_shadow_tree_element(browser, By.ID, 'id_username')
    password_input = mgr.find_shadow_tree_element(browser, By.ID, 'id_password')
    continue_button = mgr.find_shadow_tree_element(browser, By.CLASS_NAME, 'btn')
    username_input.send_keys(username)
    password_input.send_keys(password)
    continue_button.click()
    time.sleep(2)
    assert(browser.current_url.endswith('/projects/'))
    yield browser
    browser.quit()

@pytest.fixture(scope='session')
def token(request, browser):
    """ Token obtained via the API Token page. """
    host = request.config.option.host
    username = request.config.option.username
    password = request.config.option.password
    keep = request.config.option.keep
    browser.get(f"{host}/token")
    time.sleep(2)
    mgr = ShadowManager(browser)
    inputs = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'input')
    for element in inputs:
        if element.get_attribute('type') == 'text':
            element.send_keys(username)
        elif element.get_attribute('type') == 'password':
            element.send_keys(password)
        elif element.get_attribute('type') == 'submit':
            button = element
    button.click()
    time.sleep(5)
    browser.save_screenshot('/home/jon/test.png')
    p_list = mgr.find_shadow_tree_elements(browser, By.TAG_NAME, 'p')
    for p in p_list:
        token = p.get_attribute('textContent')
        if len(token) == 40:
            break
    yield token

@pytest.fixture(scope='session')
def project(request, browser, token):
    """ Project created with setup_project.py script, all options enabled. """
    host = request.config.option.host
    name = f"Front End Test Project {datetime.datetime.now()}"
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
    
    time.sleep(2)
    
        
    yield project_id
    if not keep:
        status = tator_api.delete_project(project_id)
