import os
from urllib.parse import urlsplit, urlunsplit

import boto3

class TatorS3:
    """Interface for object storage.
    """
    def __init__(self, bucket=None):
        """ Creates the S3 interface.
        """
        if bucket is None:
            endpoint = os.getenv('OBJECT_STORAGE_HOST')
            region = os.getenv('OBJECT_STORAGE_REGION_NAME')
            access_key = os.getenv('OBJECT_STORAGE_ACCESS_KEY')
            secret_key = os.getenv('OBJECT_STORAGE_SECRET_KEY')
            self.bucket_name = os.getenv('BUCKET_NAME')
        else:
            endpoint = bucket.endpoint_url
            region = bucket.region
            access_key = bucket.access_key
            secret_key = bucket.secret_key
            self.bucket_name = bucket.name
        if endpoint:
            self.s3 = boto3.client('s3',
                                   endpoint_url=f'{endpoint}',
                                   region_name=region,
                                   aws_access_key_id=access_key,
                                   aws_secret_access_key=secret_key)
        else:
            # Client generator will not have env variables defined
            self.s3 = boto3.client('s3')

    def get_download_url(self, path, expiration):
        external_host = os.getenv('OBJECT_STORAGE_EXTERNAL_HOST')
        if os.getenv('REQUIRE_HTTPS') == 'TRUE':
            PROTO = 'https'
        else:
            PROTO = 'http'
        # Generate presigned url.
        url = self.s3.generate_presigned_url(ClientMethod='get_object',
                                             Params={'Bucket': self.bucket_name,
                                                     'Key': path},
                                             ExpiresIn=expiration)
        # Replace host if external host is given.
        if external_host:
            parsed = urlsplit(url)
            parsed = parsed._replace(netloc=external_host, scheme=PROTO)
            url = urlunsplit(parsed)
        return url

