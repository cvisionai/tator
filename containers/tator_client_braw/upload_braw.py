import os
import argparse
import subprocess
from textwrap import dedent

import tator

def parse_args():
    parser = argparse.ArgumentParser(description=dedent('''\
    Imports Blackmagic RAW files into Tator.

    First, videos are transcoded into a high quality archival format. Then, a local
    transcode is performed. The import is idempotent, with existence determined by filename.

    Example usage:
      python3 upload_braw.py --host $HOST --token $TOKEN --project 1 --video_type 1 \
      --section_name "BRAW Test" /data
    '''), formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--host', help='API host.', required=True)
    parser.add_argument('--token', help='API token.', required=True)
    parser.add_argument('--project', help='Unique integer identifying project.',
                        required=True, type=int)
    parser.add_argument('--video_type', help='Unique integer identifying video type.',
                        required=True, type=int)
    parser.add_argument('--section_name', help='Name of section to create videos. If it does .'
                        'not exist it will be created.', required=True, type=str)
    parser.add_argument('--crf', help='CRF for archival encode. Default is 23.',
                        default=23, type=int)
    parser.add_argument('--work_dir', help='Working directory for archival files. If not given '
                        'the input directory will be used.', required=False, type=str)
    parser.add_argument('directory', help='Local path to braw files.', type=str)
    args = parser.parse_args()
    if args.work_dir is None:
        args.work_dir = args.directory
    return args

def get_file_list(args, api):
    needs_archival = []
    needs_upload = []
    # Get media list
    section = api.get_section_list(args.project, name=args.section_name)
    if len(section) == 1:
        medias = api.get_media_list(args.project, section=section[0].id)
    else:
        medias = []
    medias = {media.name:media for media in medias}
    for fname in os.listdir(args.directory):
        path = os.path.join(args.directory, fname)
        name = os.path.basename(fname)
        ext = os.path.splitext(fname)[1]
        archive_path = os.path.join(args.work_dir, f"{name}.mp4")
        if ext == '.braw':
            # Check if this file needs an archival transcode.
            if not os.path.exists(archive_path):
                needs_archival.append((path, archive_path))
            # Check if this file needs an upload.
            if name not in medias:
                needs_upload.append(archive_path)
    print(f"Found {len(needs_archival)} files needing archival conversion.")
    print(f"Found {len(needs_upload)} files needing upload.")
    return needs_archival, needs_upload

def find_best_encoder(codec):
    """ Find the best encoder based on what is available on the system """
    # Default codecs
    encoder_lookup={"hevc": "libsvt_hevc",
                    "h264": "libx264"}
    cmd = [
        "ffmpeg",
        "-encoders" ]
    output=subprocess.run(cmd,stdout=subprocess.PIPE,check=True).stdout.decode()
    if output.find("hevc_qsv") >= 0:
        encoder_lookup["hevc"] = "hevc_qsv"
    if output.find("h264_qsv") >= 0:
        encoder_lookup["h264"] = "h264_qsv"
    print(f"encoder_lookup = {encoder_lookup}")
    return encoder_lookup.get(codec,codec)

def convert_archival(args, src, dest):
    print(f"Converting {src}...")
    cmd = ["braw-decode", "-f", src]
    input_args = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    input_args = input_args.split()
    codec = find_best_encoder('hevc')
    cmd = ["ffmpeg", "-y", *input_args,
           "-c:v", codec,
           "-crf", str(args.crf),
           "-pix_fmt", "yuv420p",
           "-tag:v", "hvc1",
           dest]
    decode = subprocess.Popen(['braw-decode', '-t', '8', src], stdout=subprocess.PIPE)
    subprocess.run(cmd, stdin=decode.stdout, check=True)
    decode.wait()

def upload(args, path):
    print(f"Uploading {path}...")
    cmd = [
        'python3', '-m', 'tator.transcode', path,
        '--host', args.host,
        '--token', args.token,
        '--project', str(args.project),
        '--type', str(args.video_type),
        '--section', args.section_name,
    ]
    subprocess.run(cmd, check=True)

if __name__ == '__main__':
    args = parse_args()
    api = tator.get_api(args.host, args.token)
    needs_archival, needs_upload = get_file_list(args, api)
    proceed = input("Continue with migration [y/N]? ")
    if proceed:
        for src, dest in needs_archival:
            convert_archival(args, src, dest)
        for path in needs_upload:
            upload(args, path)
    else:
        print("Upload cancelled.")
    
