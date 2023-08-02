import os
import requests
import tempfile
import uuid

import tator
from tator.util._upload_file import _upload_file
from tator.transcode.make_thumbnails import make_thumbnails
from tator.transcode.transcode import make_video_definition

def download_file(url, output):
    print(f"Downloading {url} to {output}")
    r = requests.get(url)
    f = open(output, 'wb')
    for chunk in r.iter_content(chunk_size=512 * 1024): 
        if chunk: # filter out keep-alive new chunks
            f.write(chunk)
    f.close()

def create_media(api, project, host, token, type_id, fname, section, media_path):
    """ Create media id and generate thumbnails """
    md5sum = tator.util.md5sum(media_path)
    spec ={
        'type': type_id,
        'section': section,
        'name': fname,
        'md5': md5sum,
        'gid': str(uuid.uuid1()),
        'uid': str(uuid.uuid1())
    }

    # Make media element to get ID
    response = api.create_media_list(project, body=[spec])
    media_id = response.id[0]

    with tempfile.TemporaryDirectory() as td:
        try:
            thumb_path = os.path.join(td,f"{uuid.uuid4()}.jpg")
            thumb_gif_path = os.path.join(td, f"{uuid.uuid4()}.gif")
            make_thumbnails(host, token, media_id, media_path, thumb_path, thumb_gif_path)
        except Exception as e:
            print(f"Thumbnail error: {e}")
            # Delete stale media
            api.delete_media(media_id)
            return None

    return media_id

def upload_media_file(api,project, media_id, media_path, segments_path):
    """ Handles uploading either archival or streaming format """
    path = os.path.basename(media_path)
    filename = os.path.splitext(os.path.basename(path))[0]
    for _, upload_info in _upload_file(api, project, media_path,
                                        media_id=media_id, filename=f"{filename}.mp4", chunk_size=0x10000000):
        pass
    for _, segment_info in _upload_file(api, project, segments_path,
                                            media_id=media_id, filename=f"{filename}.json", chunk_size=0x10000000):
        pass
    # Construct create video file spec.
    media_def = {**make_video_definition(media_path),
                    'path': upload_info.key,
                    'segment_info': segment_info.key}
    response = api.create_video_file(media_id, role='streaming',
                                        video_definition=media_def)
    return response

def get_video_path(page):
    """ Gets a page with video name set to the current test.
    """
    dir_name = os.path.dirname(page.video.path())
    test_name = os.getenv('PYTEST_CURRENT_TEST')
    test_name = test_name.replace('/', '__').replace('.py::', '__').split('[')[0]
    file_name = f"{test_name}.webm"
    path = os.path.join(dir_name, file_name)
    return path

def print_page_error(err):
    print("--------------------------------")
    print("Got page error:")
    print(f"Message: {err.message}")
    print(f"Name: {err.name}")
    print(f"Stack: {err.stack}")
    print("--------------------------------")
