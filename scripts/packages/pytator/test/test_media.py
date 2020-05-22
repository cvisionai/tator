
import pytator
import tempfile
import os
from._common import assert_vector_equal

def test_get_frame(url, token, project, video):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)

    with tempfile.TemporaryDirectory() as temp_dir:
        outpath = os.path.join(temp_dir, "video.mp4")
        tator.Media.downloadFile(video_obj, outpath)
        assert(os.path.exists(outpath))

