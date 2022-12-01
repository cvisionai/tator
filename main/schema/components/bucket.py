s3_config = {
    "endpoint_url": {"description": "Endpoint URL for bucket.", "type": "string"},
    "region_name": {"description": "Bucket region.", "type": "string"},
    "aws_access_key_id": {"description": "Account access key.", "type": "string"},
    "aws_secret_access_key": {"description": "Account secret key.", "type": "string"},
}
s3_required = list(s3_config.keys())
gcp_config = {
    "type": {"description": "Type of account, should be `service_account`.", "type": "string"},
    "project_id": {"description": "GCP project id.", "type": "string"},
    "private_key_id": {"description": "Account secret key.", "type": "string"},
    "private_key": {"description": "Account access key.", "type": "string"},
    "client_email": {"description": "Email address associated with the service account.", "type": "string"},
    "client_id": {"description": "ID of the client account.", "type": "string"},
    "auth_uri": {"description": "Authorization URI.", "type": "string"},
    "token_uri": {"description": "Token URI.", "type": "string"},
    "auth_provider_x509_cert_url": {"description": "Provider cert url.", "type": "string"},
    "client_x509_cert_url": {"description": "Client cert url.", "type": "string"},
}
gcp_required = list(gcp_config.keys())
oci_native_config = {
    "user": {"description": "User OCID.", "type": "string"},
    "key_content": {"description": "Private key content.", "type": "string"},
    "fingerprint": {"description": "Public key fingerprint.", "type": "string"},
    "tenancy": {"description": "Tenancy OCID.", "type": "string"},
    "region": {"description": "OCI region.", "type": "string"},
}
oci_native_required = list(oci_native_config.keys())
oci_config = {
    "boto3_config": {"type": "object", "required": s3_required, "properties": s3_config},
    "native_config": {
        "type": "object",
        "required": oci_native_required,
        "properties": oci_native_config,
    },
}
# TODO add "native_config" to required once implemented
oci_required = ["boto3_config"] # list(oci_config.keys())

bucket_properties = {
    "name": {
        "description": "Bucket name.",
        "type": "string",
    },
    "archive_sc": {
        "description": "Storage class in which archived objects live.",
        "type": "string",
    },
    "live_sc": {
        "description": "Storage class in which live objects live.",
        "type": "string",
    },
    "store_type": {
        "description": "Type of object store on which the bucket is hosted.",
        "type": "string",
        "enum": ["AmazonS3", "MinIO", "UploadServer", "OCI"], # TODO update these when ObjectStore changes
    },
}

all_bucket_properties = {
    "config": {
        "description": "JSON string containing Google Cloud Storage credentials.",
        "oneOf": [
            {"type": "object", "required": s3_required, "properties": s3_config},
            {"type": "object", "required": gcp_required, "properties": gcp_config},
            {"type": "object", "required": oci_required, "properties": oci_config}, 
        ],
    },
    **bucket_properties,
}

bucket_spec = {
    "type": "object", "required": ["name", "config"], "properties": all_bucket_properties
}

bucket_update = {
    "type": "object",
    "properties": all_bucket_properties,
}

bucket = {
    "type": "object",
    "description": "Bucket object.",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying a bucket.",
        },
        "organization": {
            "type": "integer",
            "description": "Unique integer identifying organization that owns this bucket.",
        },
        **bucket_properties,
    },
}
