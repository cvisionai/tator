import os

import boto3

def _s3_client():
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
