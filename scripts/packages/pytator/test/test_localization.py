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
        'w': w,
        'h': h,
        'test_bool': random.choice([False, True]),
        'test_int': random.randint(-1000, 1000),
        'test_float': random.uniform(-1000.0, 1000.0),
        'test_enum': random.choice(['a', 'b', 'c']),
        'test_str': uuid.uuid1(),
        'test_datetime': datetime.datetime.now().isoformat(),
        'test_geopos': [random.uniform(-180.0, 180.0), random.uniform(-90.0, 90.0)],
        'project': project,
        'type': box_type,
        'media_id': video_obj['id'],
        'frame': random.uniform(0, video_obj['num_frames'] - 1),
    }

def test_localization_crud(url, token, project, video_type, video, box_type):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)
    print(f'VIDEO OBJ: {video_obj}')

    # Create some boxes
    num_localizations = random.randint(0, 1000)
    boxes = [
        random_localization(project, box_type, video_obj)
        for _ in range(num_localizations)
    ]
    status, response = tator.Localization.new(boxes)
    assert status == 201
   
    # Patch a box
    #update = random_localization(project, box_type, video_obj)
    
