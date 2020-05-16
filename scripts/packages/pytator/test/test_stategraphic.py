import pytator
from ._common import assert_vector_equal

def _make_box(project, box_type, video, frame):
    return {
        'x': 0,
        'y': 0,
        'width': 1,
        'height': 1,
        'project': project,
        'type': box_type,
        'media_id': video,
        'frame': frame,
    }

def test_stategraphic(url, token, project, video, box_type, track_type):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)

    # Make boxes for track.
    boxes = [_make_box(project, box_type, video, frame) for frame in range(10)]
    status, response = tator.Localization.new(boxes)
    print(f"New localization response: {response}")
    assert status == 201
    box_ids = response['id']

    # Make track.
    status, response = tator.State.new([{
        'project': project,
        'type': track_type,
        'media_ids': [video],
        'localization_ids': box_ids,
    }])
    assert(status == 201)
    track_id = response['id'][0]

    # Get state graphic.
    code, stategraphic = tator.StateGraphic.get_bgr(track_id)
    assert(code == 200)
    assert(len(stategraphic) == 10)
    for frame_data in stategraphic:
        assert_vector_equal(frame_data.shape, (720,1280,3))
    

