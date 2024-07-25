# This file is outside the `api/main/rest/` folder to avoid the imports in that module's __init__.py
import os
import sys
import logging

try:
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tator_online.settings")
    django.setup()
except Exception:
    pass

from PIL import Image, ImageOps
import pillow_avif  # add AVIF support to pillow
from pillow_heif import register_heif_opener

register_heif_opener()
import tempfile
from urllib.parse import urlparse

from main.models import Media, Resource
from main.store import get_tator_store

from main.download import download_file
from main.rest._util import url_to_key

import time

logger = logging.getLogger(__name__)

def _import_image(name, url, thumbnail_url, media_id, reference_only):
    """Note: In reference_only mode we do not store an alt image format"""
    total_start = time.time()
    try:
        media_obj = Media.objects.get(pk=media_id)
    except Exception:
        return
    project_obj = media_obj.project
    try:
        tator_store = get_tator_store(project_obj.bucket)
    except Exception:
        return
    alt_images = []
    alt_formats = []

    if url:
        download_start = time.time()
        # Download the image file and load it.
        # This is required even in reference cases because we need to get the
        # dimensions, encoding, and likely generate a thumbnail.
        ext = os.path.splitext(name)[1].lower()
        if ext in [".dng"]:
            # Digital Negative files need conversion
            temp_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
            temp_dng = tempfile.NamedTemporaryFile(delete=False, suffix=".dng")
            download_file(url, temp_dng.name, 5)
            with rawpy.imread(temp_dng.name) as raw:
                rgb = raw.postprocess()
            imageio.imwrite(temp_image.name, rgb)
            os.remove(temp_dng.name)
        else:
            temp_image = tempfile.NamedTemporaryFile(delete=False)
            download_file(url, temp_image.name, 5)

        logger.info(f"Downloaded {url} in {time.time() - download_start} seconds")
        image = Image.open(temp_image.name)
        image_format = image.format

        exif_transpose_start = time.time()
        image = ImageOps.exif_transpose(image)
        media_obj.width, media_obj.height = image.size
        logger.info(
            f"Exif transpose took {time.time() - exif_transpose_start} seconds format={image_format}"
        )

        alt_format_start = time.time()
        # Add a png for compatibility purposes in case of HEIF or AVIF import.
        # always make AVIF
        if reference_only is False:
            if not image_format in ["PNG", "JPEG"]:
                logging.info(
                    f"{image_format} is not PNG or JPEG, converting to PNG --- is png/jpeg: {image_format in ['PNG', 'JPEG']}"
                )
                alt_image = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                image.save(alt_image, format="png", quality=100, subsampling=0)
                alt_images.append(alt_image)
                alt_formats.append("png")
            png_end = time.time()

            alt_image = tempfile.NamedTemporaryFile(delete=False, suffix=".avif")
            image.save(alt_image, format="avif", quality=100)
            alt_images.append(alt_image)
            alt_formats.append("avif")
            avif_end = time.time()
        logger.info(
            f"Alt format generation took {time.time() - alt_format_start} seconds png={png_end-alt_format_start} avif={avif_end-png_end}"
        )

        # Download or create the thumbnail.
        if thumbnail_url is None:
            thumbnail_start = time.time()
            temp_thumb = tempfile.NamedTemporaryFile(delete=False)
            thumb_size = (256, 256)
            image = image.convert("RGB")  # Remove alpha channel for jpeg
            image.thumbnail(thumb_size, Image.LANCZOS)
            image.save(temp_thumb.name, format="jpeg")
            thumb_name = "thumb.jpg"
            thumb_format = "jpg"
            thumb_width = image.width
            thumb_height = image.height
            image.close()
            logger.info(f"Thumbnail generation took {time.time() - thumbnail_start} seconds")

    if thumbnail_url:
        thumbnail_fetch_start = time.time()
        temp_thumb = tempfile.NamedTemporaryFile(delete=False)
        download_file(thumbnail_url, temp_thumb.name)
        thumb = Image.open(temp_thumb.name)
        thumb_name = os.path.basename(urlparse(thumbnail_url).path)
        thumb_format = thumb.format
        thumb_width = thumb.width
        thumb_height = thumb.height
        thumb.close()
        logger.info(f"Thumbnail download took {time.time() - thumbnail_fetch_start} seconds")

    media_obj.media_files = {}
    if reference_only and url:
        if media_obj.media_files is None:
            media_obj.media_files = {}
        media_obj.media_files["image"] = [
            {
                "path": url,
                "size": os.stat(temp_image.name).st_size,
                "resolution": [media_obj.height, media_obj.width],
                "mime": f"image/{image_format.lower()}",
            }
        ]
    else:
        media_obj.media_files["image"] = []

    upload_start = time.time()
    # Handle all formats the same way
    for alt_image, alt_format in zip(alt_images, alt_formats):
        alt_name = f"image.{alt_format}"
        if media_obj.media_files is None:
            media_obj.media_files = {}
        # Upload image.
        image_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{alt_name}"
        # alt_image fp doesn't seem to work here (odd)
        with open(alt_image.name, "rb") as temp_fp:
            tator_store.put_object(image_key, temp_fp)
        media_obj.media_files["image"].extend(
            [
                {
                    "path": image_key,
                    "size": os.stat(alt_image.name).st_size,
                    "resolution": [media_obj.height, media_obj.width],
                    "mime": f"image/{alt_format.lower()}",
                }
            ]
        )
        os.remove(alt_image.name)
        Resource.add_resource(image_key, media_obj)
    logger.info(f"Upload took {time.time() - upload_start} seconds")

    thumbnail_upload_start = time.time()
    if url or thumbnail_url:
        if media_obj.media_files is None:
            media_obj.media_files = {}
        # Upload thumbnail.
        thumb_format = image.format
        thumb_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{thumb_name}"
        tator_store.put_object(thumb_key, temp_thumb)
        media_obj.media_files["thumbnail"] = [
            {
                "path": thumb_key,
                "size": os.stat(temp_thumb.name).st_size,
                "resolution": [thumb_height, thumb_width],
                "mime": f"image/{thumb_format}",
            }
        ]
        os.remove(temp_thumb.name)
        Resource.add_resource(thumb_key, media_obj)
    logger.info(f"Thumbnail upload took {time.time() - thumbnail_upload_start} seconds")

    media_obj.save()

    # If this is an upload to Tator, put media ID as object tag.
    if url:
        path, bucket, upload = url_to_key(url, project_obj)
        if path is not None:
            use_upload_bucket = upload and not bucket
            tator_store = get_tator_store(bucket, upload=use_upload_bucket)
            tator_store.put_media_id_tag(path, media_obj.id)

    print(f"Total time: {time.time() - total_start} seconds")
