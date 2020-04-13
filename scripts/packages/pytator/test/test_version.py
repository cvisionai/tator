import pytator

def test_version_crud(url, token, project):
    tator = pytator.Tator(url, token, project)
    status, response = tator.Version.new({
        'name': 'Test Version',
        'description': 'A version for testing',
    })
    assert True
