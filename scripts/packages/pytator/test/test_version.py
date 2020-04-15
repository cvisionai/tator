import pytator

def test_version_crud(url, token, project):
    tator = pytator.Tator(url, token, project)

    # Test single create.
    status, response = tator.Version.new({
        'name': 'Test Version',
        'description': 'A version for testing',
    })
    pk = response['id']
    assert status == 201

    # Test patch.
    status, response = tator.Version.update(pk, {'name': 'Updated Version'})
    assert status == 200

    # Compare with get results.
    updated = tator.Version.get(pk)
    assert updated['name'] == 'Updated Version'

    # Test delete.
    status = tator.Version.delete(pk)
    assert status == 204
