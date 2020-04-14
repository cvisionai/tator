import datetime
import random
import uuid

import pytator

def random_localization(project, box_type, video_obj):
    x = random.uniform(0.0, 1.0)
    y = random.uniform(0.0, 1.0)
    w = random.uniform(0.0, 1.0 - x)
    h = random.uniform(0.0, 1.0 - y)
    return {
        'x': x,
        'y': y,
        'width': w,
        'height': h,
        'project': project,
        'type': box_type,
        'media_id': video_obj['id'],
        'frame': random.randint(0, video_obj['num_frames'] - 1),
        'attributes': {
            'test_bool': random.choice([False, True]),
            'test_int': random.randint(-1000, 1000),
            'test_float': random.uniform(-1000.0, 1000.0),
            'test_enum': random.choice(['a', 'b', 'c']),
            'test_str': str(uuid.uuid1()),
            'test_datetime': datetime.datetime.now().isoformat(),
            'test_geopos': [random.uniform(-180.0, 180.0), random.uniform(-90.0, 90.0)],
        }
    }

def is_number(x):
    try:
        float(x)
        return True
    except:
        return False

def assert_close_enough(a, b):
    for key in a:
        if key in ['project', 'type', 'media_id', 'id', 'meta', 'user']:
            continue
        assert key in b
        if is_number(a[key]):
            assert abs(a[key] - b[key]) < 0.0001
        else:
            assert a[key] == b[key]

def test_localization_crud(url, token, project, video_type, video, box_type, attribute_types):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)

    # Test bulk create.
    num_localizations = random.randint(0, 1000)
    boxes = [
        random_localization(project, box_type, video_obj)
        for _ in range(num_localizations)
    ]
    status, response = tator.Localization.addMany(boxes)
    print(f"New localization response: {response}")
    assert status == 201

    # Test single create.
    box = random_localization(project, box_type, video_obj)
    status, response = tator.Localization.new(box)
    box_id = response['id'][0]
    assert status == 201

    # Patch single box.
    patch = random_localization(project, box_type, video_obj)
    status, response = tator.Localization.update(box_id, patch)
    assert status == 200

    # Get single box.
    updated_box = tator.Localization.get(box_id)
    assert_close_enough(patch, updated_box)
    
    # Delete single box.
    status = tator.Localization.delete(box_id)
    assert status == 204

    # Bulk update box attributes.
    bulk_patch = random_localization(project, box_type, video_obj)
    bulk_patch = {'attributes': bulk_patch['attributes']}
    params = {'media_id': video, 'type': box_type}
    status, response = tator.Localization.bulk_update(params, bulk_patch)
    assert status == 200

    # Verify all boxes have been updated.
    boxes = tator.Localization.filter(params)
    print(f"NUM BOXES: {len(boxes)}")
    for box in boxes:
        assert_close_enough(bulk_patch, box)
    
    # Delete all boxes.
    status = tator.Localization.bulk_delete(params)
    assert status == 204

    # Verify all boxes are gone.
    boxes = tator.Localization.filter(params)
    assert boxes == []
