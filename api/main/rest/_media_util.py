""" TODO: add documentation for this """
import logging
import os
import json
import subprocess
import math
import io
import textwrap
import mmap
import sys

from PIL import Image, ImageDraw, ImageFont
from django.conf import settings

from ..store import get_storage_lookup
from ..models import Resource

logger = logging.getLogger(__name__)


class MediaUtil:
    """TODO: add documentation for this"""

    def __init__(self, video, temp_dir, quality=None):
        self._temp_dir = temp_dir
        # If available we only attempt to fetch
        # the part of the file we need to
        self._segment_info = None
        resources = Resource.objects.filter(media__in=[video])
        store_lookup = get_storage_lookup(resources)

        if "streaming" in video.media_files:
            if quality is None:
                # Select highest quality if not specified
                highest_res = -1
                quality_idx = 0
                for idx, media_info in enumerate(video.media_files["streaming"]):
                    if media_info["resolution"][0] > highest_res:
                        highest_res = media_info["resolution"][0]
                        quality_idx = idx
            else:
                max_delta = sys.maxsize
                for idx, media_info in enumerate(video.media_files["streaming"]):
                    delta = abs(quality - media_info["resolution"][0])
                    if delta < max_delta:
                        max_delta = delta
                        quality_idx = idx
            if "hls" in video.media_files["streaming"][quality_idx]:
                self._external_fetch = "hls"
                self._video_file = video.media_files["streaming"][quality_idx]["hls"]
                self._storage = None  # no buckets here
            else:
                self._external_fetch = None
                self._video_file = video.media_files["streaming"][quality_idx]["path"]
                self._storage = store_lookup[self._video_file]
                self._height = video.media_files["streaming"][quality_idx]["resolution"][0]
                self._width = video.media_files["streaming"][quality_idx]["resolution"][1]
                segment_file = video.media_files["streaming"][quality_idx]["segment_info"]
                f_p = io.BytesIO()
                self._storage.download_fileobj(segment_file, f_p)
                self._segment_info = json.loads(f_p.getvalue().decode("utf-8"))
                self._moof_data = [
                    (i, x)
                    for i, x in enumerate(self._segment_info["segments"])
                    if x["name"] == "moof"
                ]
                self._start_bias_frame = 0
                if self._moof_data[0][1]["frame_start"] > 0:
                    self._start_bias_frame = self._moof_data[0][1]["frame_start"]

        elif "image" in video.media_files:
            # Select highest quality image that is non AVIF (no ffmpeg support)
            highest_res = -1
            quality_idx = 0
            # only process non AVIF sources
            images = video.media_files["image"]
            images = [i for i in images if i["mime"] != "image/avif"]
            logger.info(images)
            for idx, media_info in enumerate(images):
                if media_info["resolution"][0] > highest_res:
                    highest_res = media_info["resolution"][0]
                    quality_idx = idx
            # Image
            self._video_file = images[quality_idx]["path"]
            self._storage = store_lookup[self._video_file]
            self._height = video.height
            self._width = video.width
        else:
            raise RuntimeError(f"Media {video.id} does not have streaming or image media!")
        self._fps = video.fps

    def _get_impacted_segments(self, frames):
        """TODO: add documentation for this"""
        if self._segment_info is None and self._external_fetch != None:
            return None

        segment_list = []
        for frame_str in frames:
            frame_seg = set()
            frame_seg.add(0)
            frame_seg.add(1)
            # We already load the header so ignore those segments
            frame = int(frame_str)
            min_idx = 0
            max_idx = len(self._moof_data) - 1
            # Handle frames and files with frame biases
            if frame < self._moof_data[0][1]["frame_start"]:
                # Force add the first two segments and all the data in between
                frame_seg.add(self._moof_data[0][0])
                for data_idx in range(self._moof_data[0][0] + 1, self._moof_data[1][0], 1):
                    frame_seg.add(data_idx)
                frame_seg.add(self._moof_data[1][0])
                frame_seg = list(frame_seg)
                frame_seg.sort()
                segment_list.append((frame, frame_seg))
                continue

            last_segment = self._moof_data[max_idx][1]  # Frame start/stop is in the moof
            if frame >= last_segment["frame_start"] + last_segment["frame_samples"]:
                continue

            # Do a binary search for the segment in question
            while min_idx <= max_idx:
                guess_idx = math.floor((max_idx + min_idx) / 2)
                moof = self._moof_data[guess_idx][1]
                if frame < moof["frame_start"]:
                    max_idx = max_idx - 1
                elif frame >= moof["frame_start"] + moof["frame_samples"]:
                    min_idx = min_idx + 1
                else:
                    frame_seg.add(self._moof_data[guess_idx][0])
                    frame_seg.add(self._moof_data[guess_idx][0] + 1)
                    if frame - moof["frame_start"] > moof["frame_samples"] - 5:
                        # Handle boundary conditions
                        if guess_idx + 1 in self._moof_data:
                            frame_seg.add(self._moof_data[guess_idx + 1][0])
                            frame_seg.add(self._moof_data[guess_idx + 1][0] + 1)
                    break

            frame_seg = list(frame_seg)
            frame_seg.sort()
            segment_list.append((frame, frame_seg))
        logger.info(f"Given {frames}, we need {segment_list}")
        return segment_list

    def _get_impacted_segments_from_ranges(self, frame_ranges):
        """TODO: add documentation for this"""
        segment_list = []
        logger.info(f"Frame Ranges = {frame_ranges}")
        for frame_range in frame_ranges:
            begin = frame_range[0]
            end = frame_range[1]
            begin_segments = self._get_impacted_segments([begin])
            end_segments = self._get_impacted_segments([end])
            range_segment_set = set()
            for frame, frame_seg in [*begin_segments, *end_segments]:
                for segment in frame_seg:
                    range_segment_set.add(segment)
            start_missing = begin_segments[0][1][-1]
            end_missing = end_segments[0][1][2]
            for frame_seg in range(start_missing, end_missing):
                range_segment_set.add(frame_seg)
            range_segment = list(range_segment_set)
            range_segment.sort()
            segment_list.append((frame_range, range_segment))
        logger.info(f"Range-based segment list: {segment_list}")
        return segment_list

    def make_temporary_videos(self, segment_list):
        """Return a temporary mp4 for each impacted segment to limit IO to
        cloud storage"""
        lookup = {}
        segment_info = []
        for frame, segments in segment_list:
            temp_video = os.path.join(self._temp_dir, f"{frame}.mp4")
            preferred_block_size = 16 * 1024
            sc_graph = [(0, 0)]
            segment_frame_start = sys.maxsize
            # create a scatter/gather
            for segment_idx in segments:
                segment = self._segment_info["segments"][segment_idx]
                last_io = sc_graph[len(sc_graph) - 1]
                if segment.get("frame_start", sys.maxsize) < segment_frame_start:
                    segment_frame_start = segment["frame_start"]

                if "frame_samples" in segment:
                    segment_info.append(
                        {
                            "frame_start": segment["frame_start"],
                            "num_frames": segment["frame_samples"],
                        }
                    )

                if last_io[0] + last_io[1] == segment["offset"]:
                    # merge contigous blocks
                    sc_graph[len(sc_graph) - 1] = (last_io[0], last_io[1] + segment["size"])
                else:
                    # A new block
                    sc_graph.append((segment["offset"], segment["size"]))

            if segment_frame_start == sys.maxsize:
                segment_frame_start = frame
            lookup[frame] = (segment_frame_start, temp_video)

            logger.info(f"Scatter gather graph = {sc_graph}")
            with open(temp_video, "wb") as out_fp:
                for scatter in sc_graph:
                    start = scatter[0]
                    stop = scatter[0] + scatter[1] - 1  # Byte range is inclusive
                    body = self._storage.get_object(self._video_file, start=start, stop=stop)
                    out_fp.write(body)

        return lookup, segment_info

    def _frame_to_time_str(self, frame, relative_to=None):
        """TODO: add documentation for this"""
        if relative_to:
            logger.info(f"Relative to = {relative_to} | provided frame = {frame}")
            frame -= relative_to

        if frame < 0:
            frame += self._start_bias_frame

        total_seconds = frame / self._fps
        hours = math.floor(total_seconds / 3600)
        minutes = math.floor((total_seconds % 3600) / 60)
        seconds = total_seconds % 60
        return f"{hours}:{minutes}:{seconds}"

    def _generate_frame_images(self, frames, rois=None, render_format="jpg", force_scale=None):
        """Generate a jpg for each requested frame and store in the working directory"""
        BATCH_SIZE = 30
        frame_idx = 0
        procs = []
        for idx in range(0, len(frames), BATCH_SIZE):
            batch = [int(frame) for frame in frames[idx : idx + BATCH_SIZE]]
            crop_filter = None
            if rois:
                crop_filter = []
                for c in rois:  # pylint: disable=invalid-name
                    w = max(
                        0, min(round(c[0] * self._width), self._width)
                    )  # pylint: disable=invalid-name
                    h = max(
                        0, min(round(c[1] * self._height), self._height)
                    )  # pylint: disable=invalid-name
                    x = max(
                        0, min(round(c[2] * self._width), self._width)
                    )  # pylint: disable=invalid-name
                    y = max(
                        0, min(round(c[3] * self._height), self._height)
                    )  # pylint: disable=invalid-name
                    crop_filter.append(f"crop={w}:{h}:{x}:{y}")
            scale_filter = None
            if force_scale:
                scale_w = force_scale[0]
                scale_h = force_scale[1]
                scale_filter = f"scale={scale_w}:{scale_h}"

            logger.info(f"Processing {self._video_file}")
            args = ["ffmpeg"]
            inputs = []
            outputs = []

            # attempt to make a temporary file in a fast manner to speed up AWS access
            impacted_segments = self._get_impacted_segments(batch)
            lookup = {}
            if impacted_segments:
                lookup, _ = self.make_temporary_videos(impacted_segments)

            for batch_idx, frame in enumerate(batch):
                outputs.extend(["-map", f"{batch_idx}:v", "-frames:v", "1", "-q:v", "3"])
                video_filters = []
                if crop_filter:
                    video_filters.append(crop_filter[frame_idx])
                if scale_filter:
                    video_filters.append(scale_filter)
                if video_filters:
                    outputs.extend(["-vf", ",".join(video_filters)])

                outputs.append(os.path.join(self._temp_dir, f"{frame_idx}.{render_format}"))
                if frame in lookup:
                    inputs.extend(
                        [
                            "-ss",
                            self._frame_to_time_str(frame, lookup[frame][0]),
                            "-i",
                            lookup[frame][1],
                        ]
                    )
                elif self._external_fetch == "hls":
                    inputs.extend(
                        [
                            "-ss",
                            self._frame_to_time_str(frame, None),
                            "-f",
                            "hls",
                            "-i",
                            self._video_file,
                        ]
                    )
                else:
                    raise ValueError("Failed to find frame {frame} in segmented mp4!")
                frame_idx += 1

            # Now add all the cmds in
            args.extend(inputs)
            args.extend(outputs)
            logger.info(args)
            procs.append(subprocess.run(args, check=True, capture_output=True))
        return any([proc.returncode == 0 for proc in procs])

    def get_image(self, roi=None, render_format="jpg", force_scale=None):
        crop_filter = None
        scale_filter = None
        if roi:
            w = max(
                0, min(round(roi[0] * self._width), self._width)
            )  # pylint: disable=invalid-name
            h = max(
                0, min(round(roi[1] * self._height), self._height)
            )  # pylint: disable=invalid-name
            x = max(
                0, min(round(roi[2] * self._width), self._width)
            )  # pylint: disable=invalid-name
            y = max(
                0, min(round(roi[3] * self._height), self._height)
            )  # pylint: disable=invalid-name
            crop_filter = f"crop={w}:{h}:{x}:{y}"
        if force_scale:
            scale_filter = f"scale={force_scale[0]}:{force_scale[1]}"

        args = ["ffmpeg", "-i", self._storage.get_download_url(self._video_file, 3600)]
        video_filters = []
        if crop_filter:
            video_filters.append(crop_filter)
        if scale_filter:
            video_filters.append(scale_filter)
        if video_filters:
            args.extend(["-vf", ",".join(video_filters)])
        output = os.path.join(self._temp_dir, f"temp.{render_format}")
        args.append(output)
        proc = subprocess.run(args, check=True, capture_output=True)
        if proc.returncode == 0:
            return output
        else:
            return None

    def get_clip(self, frame_ranges, reencode=False):
        """Given a list of frame ranges generate a temporary mp4

        :param frame_ranges: tuple or list of tuples representing (begin,
                                                                   end) -- range is inclusive!
        """
        if isinstance(frame_ranges, tuple):
            frame_ranges = [frame_ranges]
        if self._external_fetch == "hls":
            lookup = {}
            segment_info = []  # There are no segment
            for idx, frange in enumerate(frame_ranges):
                temp_out = os.path.join(self._temp_dir, f"{frange[0]}_{frange[1]}.mp4")
                ffmpeg_args = [
                    "ffmpeg",
                    "-f",
                    "hls",
                    "-i",
                    self._video_file,
                    "-ss",
                    self._frame_to_time_str(frange[0], None),
                    "-frames:v",
                    str(frange[1] - frange[0]),
                    temp_out,
                ]
                proc = subprocess.run(ffmpeg_args, check=True, capture_output=True)
                lookup = {"{frange[0]}_{frange[1]}.mp4": (None, temp_out)}
        else:
            impacted_segments = self._get_impacted_segments_from_ranges(frame_ranges)
            assert not impacted_segments is None, "Unable to calculate impacted video segments"
            lookup, segment_info = self.make_temporary_videos(impacted_segments)

        logger.info(f"Lookup = {lookup}")
        with open(os.path.join(self._temp_dir, "vid_list.txt"), "w") as vid_list:
            for idx, (_, f_p) in enumerate(lookup.values()):
                mux_0 = os.path.join(self._temp_dir, f"{idx}_0.mp4")
                args = [
                    "ffmpeg",
                    "-i",
                    f_p,
                    "-c",
                    "copy",
                    "-muxpreload",
                    "0",
                    "-muxdelay",
                    "0",
                    mux_0,
                ]
                proc = subprocess.run(args, check=True, capture_output=True)
                vid_list.write(f"file '{mux_0}'\n")

        output_file = os.path.join(self._temp_dir, "concat.mp4")

        if reencode == True:
            encode_params = ["-c:v", "libx264", "-preset", "veryfast"]
        else:
            encode_params = ["-c:v", "copy"]
        args = [
            "ffmpeg",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            os.path.join(self._temp_dir, "vid_list.txt"),
            *encode_params,
            output_file,
        ]
        proc = subprocess.run(args, check=True, capture_output=True)
        return output_file, segment_info

    def isVideo(self) -> bool:
        """Returns true if the media is video or not"""

        return self._fps is not None

    def getWidth(self) -> int:
        """Gets the width of the video/image in pixels"""

        return self._width

    def getHeight(self) -> int:
        """Gets the height of the video/image in pixels"""

        return self._height

    def get_cropped_image(self, roi, render_format="jpg", force_scale=None) -> str:
        """Generate an image of the given ROI

        Args:
            roi: tuple
                (width, height, x, y) Relative values (0.0 .. 1.0)

            render_format: str
                'jpg' or 'png'

            force_scale: tuple
                (width: int, height: int) Forced image size in pixels

        Returns:
            Image file path
        """

        left = roi[2] * self._width
        upper = roi[3] * self._height
        right = left + roi[0] * self._width
        lower = upper + roi[1] * self._height

        out = io.BytesIO()
        self._storage.download_fileobj(self._video_file, out)
        out.seek(0)
        img = Image.open(out)
        img = img.crop((left, upper, right, lower))

        if force_scale is not None:
            img = img.resize(force_scale)

        img_buf = io.BytesIO()
        if render_format == "jpg":
            img.save(img_buf, "jpeg", quality=95)
        else:
            img.save(img_buf, "png", quality=95)
        return img_buf.getvalue()

    def get_tile_image(
        self, frames, rois=None, tile_size=None, render_format="jpg", force_scale=None
    ):
        """Generate a tile jpeg of the given frame/rois"""
        # Compute tile size if not supplied explicitly
        try:
            if tile_size is not None:
                # check supplied tile size makes sense
                comps = tile_size.split("x")
                if len(comps) != 2:
                    raise Exception("Bad Tile Size")
                if int(comps[0]) * int(comps[1]) < len(frames):
                    raise Exception("Bad Tile Size")
        except:
            tile_size = None
            # compute the required tile size
        if tile_size is None:
            width = math.ceil(math.sqrt(len(frames)))
            height = math.ceil(len(frames) / width)
            tile_size = f"{width}x{height}"

        if (
            self._generate_frame_images(
                frames, rois, render_format=render_format, force_scale=force_scale
            )
            == False
        ):
            return None

        output_file = None
        if len(frames) > 1:
            # Make a tiled jpeg
            tile_args = [
                "ffmpeg",
                "-i",
                os.path.join(self._temp_dir, f"%d.{render_format}"),
                "-vf",
                f"tile={tile_size}",
                "-q:v",
                "3",
                os.path.join(self._temp_dir, f"tile.{render_format}"),
            ]
            logger.info(tile_args)
            proc = subprocess.run(tile_args, check=True, capture_output=True)
            if proc.returncode == 0:
                output_file = os.path.join(self._temp_dir, f"tile.{render_format}")
        else:
            output_file = os.path.join(self._temp_dir, f"0.{render_format}")

        return output_file

    def get_animation(self, frames, roi, fps, render_format, force_scale):
        """TODO: add documentation for this"""
        if (
            self._generate_frame_images(frames, roi, render_format="jpg", force_scale=force_scale)
            == False
        ):
            return None

        mp4_args = [
            "ffmpeg",
            "-framerate",
            str(fps),
            "-i",
            os.path.join(self._temp_dir, "%d.jpg"),
            os.path.join(self._temp_dir, "temp.mp4"),
        ]
        proc = subprocess.run(mp4_args, check=True, capture_output=True)

        if render_format == "mp4":
            return os.path.join(self._temp_dir, "temp.mp4")
        else:
            # Convert temporary mp4 into a gif
            gif_args = [
                "ffmpeg",
                "-i",
                os.path.join(self._temp_dir, "temp.mp4"),
                "-filter_complex",
                "[0:v] split [a][b];[a] palettegen" " [p];[b][p] paletteuse",
                os.path.join(self._temp_dir, "animation.gif"),
            ]
            logger.info(gif_args)
            proc = subprocess.run(gif_args, check=True, capture_output=True)
            return os.path.join(self._temp_dir, "animation.gif")

    def generate_error_image(code, message, img_format="png"):
        """TODO: add documentation for this"""
        font_bold = ImageFont.truetype("DejaVuSans-Bold.ttf", 32)
        font = ImageFont.truetype("DejaVuSans.ttf", 28)
        img = Image.open("/images/computer.jpg")
        img = img.resize([1024, 1024])
        draw = ImageDraw.Draw(img)
        W, H = img.size  # pylint: disable=invalid-name

        x_bias = 60
        header = f"Error {code}"

        def textsize(text, font):
            im = Image.new(mode="P", size=(0, 0))
            draw = ImageDraw.Draw(im)
            _, _, width, height = draw.textbbox((0, 0), text=text, font=font)
            return width, height

        w, h = textsize(header, font)  # pylint: disable=invalid-name
        logger.info(f"{W}-{w}/2; {H}-{h}/2")

        draw.text((W / 2 - ((w / 2) + x_bias), 160), header, (255, 62, 29), font=font_bold)

        _, line_height = textsize(message, font)
        line_height *= 3
        start_height = 300 - line_height
        lines = textwrap.wrap(message, 40)
        for line_idx, line in enumerate(lines):
            draw.text(
                (200, start_height + (line_height * line_idx)), line, (255, 62, 29), font=font
            )

        img_buf = io.BytesIO()
        if img_format == "jpg":
            img.save(img_buf, "jpeg", quality=95)
        else:
            img.save(img_buf, "png", quality=95)
        return img_buf.getvalue()
