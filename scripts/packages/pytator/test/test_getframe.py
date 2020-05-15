
import pytator
from ._common import assert_vector_equal

def test_get_frame(url, token, project, video):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)

    frames = [50,100,150]
    code,frame_bgr = tator.GetFrame.get_bgr(video, frames)

    assert(code == 200)
    assert(len(frame_bgr) == 3)
    for frame_data in frame_bgr:
        assert_vector_equal(frame_data.shape, (720,1280,3))
    

