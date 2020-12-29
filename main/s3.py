import os
from urllib.parse import urlsplit, urlunsplit

import boto3

def s3_client():
    """ Returns an s3 client.
    """
    endpoint = os.getenv('OBJECT_STORAGE_HOST')
    access_key = os.getenv('OBJECT_STORAGE_ACCESS_KEY')
    secret_key = os.getenv('OBJECT_STORAGE_SECRET_KEY')

    # Set up client.
    s3 = boto3.client('s3',
                      endpoint_url=f'http://{endpoint}',
                      aws_access_key_id=access_key,
                      aws_secret_access_key=secret_key)
    return s3

def get_download_url(s3, path, expiration):
    if path.startswith('/'):
        url = path
    else:
        bucket_name = os.getenv('BUCKET_NAME')
        external_host = os.getenv('OBJECT_STORAGE_EXTERNAL_HOST')
        if os.getenv('REQUIRE_HTTPS') == 'TRUE':
            PROTO = 'https'
        else:
            PROTO = 'http'
        # Generate presigned url.
        url = s3.generate_presigned_url(ClientMethod='get_object',
                                        Params={'Bucket': bucket_name,
                                                'Key': path},
                                        ExpiresIn=expiration)
        # Replace host if external host is given.
        if external_host:
            parsed = urlsplit(url)
            parsed = parsed._replace(netloc=external_host, scheme=PROTO)
            url = urlunsplit(parsed)
    return url
