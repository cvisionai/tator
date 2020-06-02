
import pytator
import tempfile
import os
from._common import assert_vector_equal

def test_get_file(url, token, project, video):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)

    with tempfile.TemporaryDirectory() as temp_dir:
        outpath = os.path.join(temp_dir, "video.mp4")
        tator.Media.downloadFile(video_obj, outpath)
        assert(os.path.exists(outpath))

def test_get_audio(url, token, project, video):
    tator = pytator.Tator(url, token, project)
    video_obj = tator.Media.get(pk=video)

    audio = video_obj['media_files'].get('audio',[])
    assert len(audio) > 0
    assert audio[0]['codec'] == 'aac'

