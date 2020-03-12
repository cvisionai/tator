import os
import argparse
import json
import subprocess
import hashlib

if __name__=="__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory")
    args = parser.parse_args()

    # This actually gets images + videos
    videos = []
    images = []
    for root, dirs, files in os.walk(args.directory):
        for fp in files:
            path = os.path.join(root,fp)
            cmd = [
                "ffprobe",
                "-v","error",
                "-show_entries", "stream",
                "-print_format", "json",
                path,
            ]
            try:
                output = subprocess.run(cmd,
                                        stdout=subprocess.PIPE,
                                        check=True).stdout
                video_info = json.loads(output)
                print(video_info)
                for idx, stream in enumerate(video_info["streams"]):
                    if stream["codec_type"] == "video":
                        codec_name = stream["codec_name"]
                        print(f"codec_name = {codec_name}")
                        # TODO: Determine a better way to know image vs. video?
                        if codec_name == "png" or codec_name == "mjpeg":
                            images.append(path)
                            print(f"Adding image {path}")
                            break
                        else:
                            print(f"Adding video {path}")
                            videos.append(path)
                            break
            except:
                pass

    def make_workflow_video(video):
        # Calculate md5
        with open(video,'rb') as fp:
            data = fp.read()
            md5 = hashlib.md5(data).hexdigest()

        base = os.path.splitext(video)[0]
        # This is the arguments for each iteration of the transcode DAG
        paths = {
            'original': video,
            'transcoded': base + '_transcoded.mp4',
            'thumbnail': base + '_thumbnail.jpg',
            'thumbnail_gif': base + '_thumbnail_gif.gif',
            'segments': base + '_segments.json',
            'entity_type': '-1', # Have server auto compute this
            'name': os.path.basename(video),
            'md5': md5
        }
        return paths

    with open(os.path.join(args.directory, "videos.json"), 'w') as work_file:
        work=[make_workflow_video(video) for video in videos]
        json.dump(work, work_file)

    with open(os.path.join(args.directory, "images.json"), 'w') as work_file:
        work=[]
        json.dump(work, work_file)

    with open(os.path.join(args.directory, "localizations.json"), 'w') as work_file:
        work=[]
        json.dump(work, work_file)

    with open(os.path.join(args.directory, "states.json"), 'w') as work_file:
        work=[]
        json.dump(work, work_file)
