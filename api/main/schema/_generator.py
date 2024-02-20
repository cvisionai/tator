from rest_framework.schemas.openapi import SchemaGenerator
from rest_framework.renderers import BaseRenderer
from django.conf import settings
import yaml

from .components import *


class NoAliasRenderer(BaseRenderer):
    media_type = "application/vnd.oai.openapi"
    charset = None
    format = "openapi"

    def __init__(self):
        assert yaml, "Using OpenAPIRenderer, but `pyyaml` is not installed."

    def render(self, data, media_type=None, renderer_context=None):
        # disable yaml advanced feature 'alias' for clean, portable, and readable output
        class Dumper(yaml.Dumper):
            def ignore_aliases(self, data):
                return True

        return yaml.dump(data, default_flow_style=False, sort_keys=False, Dumper=Dumper).encode(
            "utf-8"
        )


class CustomGenerator(SchemaGenerator):
    """Schema generator for Swagger UI."""

    def get_schema(self, request=None, public=True, parser=False):
        schema = super().get_schema(request, public)

        # Set up schema components.
        schema["components"] = {
            "schemas": {
                "AffiliationSpec": affiliation_spec,
                "AffiliationUpdate": affiliation_update,
                "Affiliation": affiliation,
                "AlgorithmParameter": algorithm_parameter,
                "Algorithm": algorithm,
                "AlgorithmSpec": algorithm_spec,
                "AlgorithmManifest": algorithm_manifest,
                "AlgorithmManifestSpec": algorithm_manifest_spec,
                "Announcement": announcement,
                "ArchiveConfig": archive_config,
                "AttributeCombinatorSpec": attribute_combinator_schema,
                "AttributeFilterSpec": attribute_filter_schema,
                "AttributeOperationSpec": attribute_operation_schema,
                "AttributeTypeSpec": attribute_type_spec,
                "AttributeTypeUpdate": attribute_type_update,
                "AttributeTypeDelete": attribute_type_delete,
                "AttributeType": attribute_type,
                "AttributeValue": attribute_value,
                "AudioDefinition": audio_definition,
                "AutocompleteService": autocomplete_service,
                "AuxiliaryFileDefinition": auxiliary_file_definition,
                "BookmarkSpec": bookmark_spec,
                "BookmarkUpdate": bookmark_update,
                "Bookmark": bookmark,
                "BucketSpec": bucket_spec,
                "BucketUpdate": bucket_update,
                "Bucket": bucket,
                "BucketGCPConfig": gcp_config,
                "BucketOCIConfig": oci_config,
                "BucketOCINativeConfig": oci_native_config,
                "BucketS3Config": s3_config,
                "ConcatDefinition": concat_definition,
                "ChangeLog": change_log,
                "CloneMediaSpec": clone_media_spec,
                "GetClonedMediaResponse": get_cloned_media_response,
                "Applet": applet,
                "AppletSpec": applet_spec,
                "DownloadInfoSpec": download_info_spec,
                "DownloadInfo": download_info,
                "EmailSpec": email_spec,
                "EmailAttachmentSpec": email_attachment_spec,
                "EncodeConfig": encode_config,
                "FavoriteSpec": favorite_spec,
                "FavoriteUpdate": favorite_update,
                "Favorite": favorite,
                "FeedDefinition": feed_definition,
                "FloatArrayQuery": float_array_query,
                "FileType": file_type,
                "FileTypeUpdate": file_type_update,
                "FileTypeSpec": file_type_spec,
                "File": file,
                "FileSpec": file_spec,
                "FileUpdate": file_update,
                "GenericFile": generic_file,
                "GenericFileSpec": generic_file_spec,
                "LiveDefinition": live_definition,
                "LiveUpdateDefinition": live_update_definition,
                "HostedTemplateSpec": hosted_template_spec,
                "HostedTemplate": hosted_template,
                "ImageDefinition": image_definition,
                "InvitationSpec": invitation_spec,
                "InvitationUpdate": invitation_update,
                "Invitation": invitation,
                "JobNode": job_node,
                "Job": job,
                "JobSpec": job_spec,
                "JobCluster": job_cluster,
                "JobClusterSpec": job_cluster_spec,
                "LeafTypeSpec": leaf_type_spec,
                "LeafTypeUpdate": leaf_type_update,
                "LeafType": leaf_type,
                "LeafSuggestion": leaf_suggestion,
                "LeafSpec": leaf_spec,
                "LeafBulkUpdate": leaf_bulk_update,
                "LeafUpdate": leaf_update,
                "Leaf": leaf,
                "LeafIdQuery": leaf_id_query,
                "LocalizationTypeSpec": localization_type_spec,
                "LocalizationTypeUpdate": localization_type_update,
                "LocalizationType": localization_type,
                "LocalizationSpec": localization_spec,
                "LocalizationBulkUpdate": localization_bulk_update,
                "LocalizationUpdate": localization_update,
                "LocalizationBulkDelete": localization_bulk_delete_schema,
                "LocalizationDelete": localization_delete_schema,
                "Localization": localization,
                "LocalizationIdQuery": localization_id_query,
                "MediaNext": media_next,
                "MediaPrev": media_prev,
                "MediaUpdate": media_update,
                "MediaBulkUpdate": media_bulk_update,
                "Media": media,
                "MediaFiles": media_files,
                "MediaIdQuery": media_id_query,
                "MediaSpec": media_spec,
                "MediaStats": media_stats,
                "MediaTypeSpec": media_type_spec,
                "MediaTypeUpdate": media_type_update,
                "MediaType": media_type,
                "MembershipSpec": membership_spec,
                "MembershipUpdate": membership_update,
                "Membership": membership,
                "MultiDefinition": multi_definition,
                "NotifySpec": notify_spec,
                "OrganizationSpec": organization_spec,
                "OrganizationUpdate": organization_update,
                "Organization": organization,
                "Parameter": parameter,
                "PasswordResetSpec": password_reset_spec,
                "ProjectSpec": project_spec,
                "ProjectUpdate": project_update,
                "Project": project,
                "ResolutionConfig": resolution_config,
                "S3StorageConfig": s3_storage_config,
                "SectionSpec": section_spec,
                "SectionUpdate": section_update,
                "Section": section,
                "StateSpec": state_spec,
                "StateBulkUpdate": state_bulk_update,
                "StateUpdate": state_update,
                "StateBulkDelete": state_bulk_delete_schema,
                "StateDelete": state_delete_schema,
                "State": state,
                "StateIdQuery": state_id_query,
                "StateTypeSpec": state_type_spec,
                "StateTypeUpdate": state_type_update,
                "StateType": state_type,
                "StateMergeUpdate": state_merge_update,
                "StateTrimUpdate": state_trim_update,
                "TemporaryFileSpec": temporary_file_spec,
                "TemporaryFile": temporary_file,
                "TranscodeSpec": transcode_spec,
                "Transcode": transcode,
                "UploadCompletionSpec": upload_completion_spec,
                "UploadInfo": upload_info,
                "UploadPart": upload_part,
                "UserSpec": user_spec,
                "UserUpdate": user_update,
                "User": user,
                "VersionSpec": version_spec,
                "VersionUpdate": version_update,
                "Version": version,
                "VideoDefinition": video_definition,
                "VideoClip": video_clip,
                "RgbColor": rgb_color,
                "RgbaColor": rgba_color,
                "HexColor": hex_color,
                "Color": color,
                "Fill": fill,
                "AlphaRange": alpha_range,
                "ColorMap": color_map,
                "CreateResponse": create_response,
                "CreateListResponse": create_list_response,
                "MessageResponse": message_response,
                "NotFoundResponse": not_found_response,
                "BadRequestResponse": bad_request_response,
                "Credentials": credentials,
                "Token": token,
            },
        }

        if not parser:
            # Set security scheme.
            schema["components"]["securitySchemes"] = {
                "TokenAuth": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "Authorization",
                },
                "SessionAuth": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-CSRFToken",
                },
            }
            schema["security"] = [
                {"TokenAuth": []},
                {"SessionAuth": []},
            ]

            # Set server entry.
            url = f"http{'s' if settings.REQUIRE_HTTPS else ''}://{settings.MAIN_HOST}"
            schema["servers"] = [{"url": url}]

        return schema
