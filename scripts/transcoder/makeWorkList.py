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
    state_files = []
    localization_files = []

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

    md5_lookup={}

    def make_workflow_video(video):
        # Calculate md5
        md5 = md5_lookup[video]

        base = os.path.splitext(video)[0]
        # This is the arguments for each iteration of the transcode DAG
        paths = {
            'url': 'None',
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

    def make_workflow_image(image):
        # Calculate md5
        md5 = md5_lookup[image]

        base = os.path.splitext(image)[0]
        # This is the arguments for each iteration of the transcode DAG
        paths = {
            'url': 'None',
            'original': image,
            'entity_type': '-1', # Have server auto compute this
            'name': os.path.basename(image),
            'md5': md5
        }
        return paths

    def states_for_media(media):
        base = os.path.splitext(media)[0]
        l = []
        for root, dirs, files in os.walk(os.path.join(args.directory,
                                                      base,
                                                      "states")):
            for fp in files:
                if os.path.splitext(fp)[-1].lower() == ".csv":
                    state_files.append({"md5": md5_lookup[media],
                                        "file": os.path.join(root,fp)})
        return l

    def localizations_for_media(media):
        base = os.path.splitext(media)[0]
        l=[]
        for root, dirs, files in os.walk(os.path.join(args.directory,
                                                      base,
                                                      "localizations")):
            for fp in files:
                if os.path.splitext(fp)[-1].lower() == ".csv":
                    l.append({"md5": md5_lookup[media],
                              "file": os.path.join(root,fp)})
        return l


    # Pre-calculate hash of videos + images
    for media in [*videos, *images]:
        with open(media,'rb') as fp:
            data = fp.read()
            md5_lookup[media] = hashlib.md5(data).hexdigest()
            state_files.extend(states_for_media(media))
            localization_files.extend(localizations_for_media(media))

    with open(os.path.join(args.directory, "videos.json"), 'w') as work_file:
        work=[make_workflow_video(video) for video in videos]
        json.dump(work, work_file)

    with open(os.path.join(args.directory, "images.json"), 'w') as work_file:
        work=[make_workflow_video(image) for image in images]
        json.dump(work, work_file)

    with open(os.path.join(args.directory, "localizations.json"), 'w') as work_file:
        json.dump(localization_files, work_file)

    with open(os.path.join(args.directory, "states.json"), 'w') as work_file:
        json.dump(state_files, work_file)
