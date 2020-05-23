import datetime
import random
import uuid
import time

import pytator
from ._common import assert_close_enough

def random_state(project, state_type, video_obj, post=False):
    attributes = {
        'test_bool': random.choice([False, True]),
        'test_int': random.randint(-1000, 1000),
        'test_float': random.uniform(-1000.0, 1000.0),
        'test_enum': random.choice(['a', 'b', 'c']),
        'test_string': str(uuid.uuid1()),
        'test_datetime': datetime.datetime.now().isoformat(),
        'test_geopos': [random.uniform(-180.0, 180.0), random.uniform(-90.0, 90.0)],
    }
    out = {
        'project': project,
        'type': state_type,
        'media_ids': [video_obj['id']],
        'frame': random.randint(0, video_obj['num_frames'] - 1),
    }
    if post:
        out = {**out, **attributes}
    else:
        out['attributes'] = attributes
    return out

def test_state_crud(url, token, project, video_type, video, state_type):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)

    # These fields will not be checked for object equivalence after patch.
    exclude = ['project', 'type', 'media_ids', 'id', 'meta', 'user', 'frame']

    # Test bulk create.
    num_states = random.randint(2000, 10000)
    states = [
        random_state(project, state_type, video_obj, post=True)
        for _ in range(num_states)
    ]
    status, response = tator.State.new(states)
    print(f"New state response: {response}")
    assert status == 201

    # Test single create.
    state = random_state(project, state_type, video_obj)
    status, response = tator.State.new([state])
    state_id = response['id'][0]
    assert status == 201

    # Patch single state.
    patch = random_state(project, state_type, video_obj)
    status, response = tator.State.update(state_id, patch)
    assert status == 200

    # Get single state.
    updated_state = tator.State.get(state_id)
    assert_close_enough(patch, updated_state, exclude)
    
    # Delete single state.
    status = tator.State.delete(state_id)
    assert status == 204

    # ES can be slow at indexing so wait for a bit.
    time.sleep(5)

    # Bulk update state attributes.
    bulk_patch = random_state(project, state_type, video_obj)
    bulk_patch = {'attributes': bulk_patch['attributes']}
    params = {'media_id': video, 'type': state_type}
    status, response = tator.State.bulk_update(params, bulk_patch)
    assert status == 200

    # Verify all states have been updated.
    states = tator.State.filter(params)
    for state in states:
        assert_close_enough(bulk_patch, state, exclude)
    
    # Delete all state.
    status = tator.State.bulk_delete(params)
    assert status == 204
    time.sleep(1)

    # Verify all states are gone.
    states = tator.State.filter(params)
    assert states == []
