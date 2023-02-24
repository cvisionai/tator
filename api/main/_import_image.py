# This file is outside the `api/main/rest/` folder to avoid the imports in that module's __init__.py
import os
import sys

try:
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tator_online.settings')
    django.setup()
except Exception:
    pass

from PIL import Image
import pillow_avif # add AVIF support to pillow
import tempfile
from urllib.parse import urlparse

from main.models import Media, Resource
from main.store import get_tator_store

from .download import download_file
from main.rest._util import url_to_key

def _import_image(name, url, thumbnail_url, media_id):
    try:
        media_obj = Media.objects.get(pk=media_id)
    except Exception:
        return
    project_obj = media_obj.project
    try:
        tator_store = get_tator_store(project_obj.bucket)
    except Exception:
        return
    alt_image = None
    if url:
        # Download the image file and load it.
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
        image = Image.open(temp_image.name)
        media_obj.width, media_obj.height = image.size
        image_format = image.format

        # Add a png for compatibility purposes
        if image_format == 'AVIF':
            alt_image = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
            image.save(alt_image, format='png')
            alt_name = "image.png"
            alt_format = 'png'
        else:
            # convert image upload to AVIF
            alt_image = tempfile.NamedTemporaryFile(delete=False, suffix='.avif')
            image.save(alt_image, format='avif')
            alt_name = "image.avif"
            alt_format = 'avif'


        # Download or create the thumbnail.
        if thumbnail_url is None:
            temp_thumb = tempfile.NamedTemporaryFile(delete=False)
            thumb_size = (256, 256)
            image = image.convert('RGB') # Remove alpha channel for jpeg
            image.thumbnail(thumb_size, Image.ANTIALIAS)
            image.save(temp_thumb.name, format='jpeg')
            thumb_name = 'thumb.jpg'
            thumb_format = 'jpg'
            thumb_width = image.width
            thumb_height = image.height
            image.close()

    if thumbnail_url:
        temp_thumb = tempfile.NamedTemporaryFile(delete=False)
        download_file(thumbnail_url, temp_thumb.name)
        thumb = Image.open(temp_thumb.name)
        thumb_name = os.path.basename(urlparse(thumbnail_url).path)
        thumb_format = thumb.format
        thumb_width = thumb.width
        thumb_height = thumb.height
        thumb.close()

    if url:
        if media_obj.media_files is None:
            media_obj.media_files = {}
        # Upload image.
        image_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{name}"
        tator_store.put_object(image_key, temp_image)
        media_obj.media_files['image'] = [{'path': image_key,
                                           'size': os.stat(temp_image.name).st_size,
                                           'resolution': [media_obj.height, media_obj.width],
                                           'mime': f'image/{image_format.lower()}'}]
        os.remove(temp_image.name)
        Resource.add_resource(image_key, media_obj)

    if alt_image:
        if media_obj.media_files is None:
            media_obj.media_files = {}
        # Upload image.
        image_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{alt_name}"
        # alt_image fp doesn't seem to work here (odd)
        with open(alt_image.name, 'rb') as temp_fp:
            tator_store.put_object(image_key, temp_fp)
        media_obj.media_files['image'].extend([{'path': image_key,
                                                'size': os.stat(alt_image.name).st_size,
                                                'resolution': [media_obj.height, media_obj.width],
                                                'mime': f'image/{alt_format.lower()}'}])
        os.remove(alt_image.name)
        Resource.add_resource(image_key, media_obj)

    if url or thumbnail_url:
        if media_obj.media_files is None:
            media_obj.media_files = {}
        # Upload thumbnail.
        thumb_format = image.format
        thumb_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{thumb_name}"
        tator_store.put_object(thumb_key, temp_thumb)
        media_obj.media_files['thumbnail'] = [{'path': thumb_key,
                                               'size': os.stat(temp_thumb.name).st_size,
                                               'resolution': [thumb_height, thumb_width],
                                               'mime': f'image/{thumb_format}'}]
        os.remove(temp_thumb.name)
        Resource.add_resource(thumb_key, media_obj)

    media_obj.save()

    # If this is an upload to Tator, put media ID as object tag.
    if url:
        path, bucket, upload = url_to_key(url, project_obj)
        if path is not None:
            use_upload_bucket = upload and not bucket
            tator_store = get_tator_store(bucket, upload=use_upload_bucket)
            tator_store.put_media_id_tag(path, media_obj.id)
