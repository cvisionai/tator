from rest_framework.schemas.openapi import SchemaGenerator

from .components import *

class CustomGenerator(SchemaGenerator):
    """ Schema generator for Swagger UI.
    """
    def get_schema(self, request=None, public=True, parser=False):
        schema = super().get_schema(request, public)

        # Set up schema components.
        schema['components'] = {
            'schemas': {
                'AlgorithmLaunchSpec': algorithm_launch_spec,
                'AlgorithmLaunch': algorithm_launch,
                'Algorithm': algorithm,
                'AnalysisSpec': analysis_spec,
                'Analysis': analysis,
                'AttributeType': attribute_type,
                'AttributeValue': attribute_value,
                'AudioDefinition': audio_definition,
                'AutocompleteService': autocomplete_service,
                'LeafTypeSpec': leaf_type_spec,
                'LeafTypeUpdate': leaf_type_update,
                'LeafType': leaf_type,
                'LeafSuggestion': leaf_suggestion,
                'LeafSpec': leaf_spec,
                'LeafUpdate': leaf_update,
                'Leaf': leaf,
                'LocalizationTypeSpec': localization_type_spec,
                'LocalizationTypeUpdate': localization_type_update,
                'LocalizationType': localization_type,
                'LocalizationSpec': localization_spec,
                'LocalizationUpdate': localization_update,
                'Localization': localization,
                'MediaNext': media_next,
                'MediaPrev': media_prev,
                'MediaUpdate': media_update,
                'Media': media,
                'MediaFiles': media_files,
                'MediaSections': media_sections,
                'MediaSpec': media_spec,
                'MediaTypeSpec': media_type_spec,
                'MediaTypeUpdate': media_type_update,
                'MediaType': media_type,
                'MembershipSpec': membership_spec,
                'MembershipUpdate': membership_update,
                'Membership': membership,
                'NotifySpec': notify_spec,
                'ProgressSpec': progress_spec,
                'ProgressSummarySpec': progress_summary_spec,
                'ProjectSpec': project_spec,
                'Project': project,
                'VideoSpec': video_spec,
                'VideoUpdate': video_update,
                'SectionAnalysis': section_analysis,
                'StateSpec': state_spec,
                'StateUpdate': state_update,
                'State': state,
                'StateTypeSpec': state_type_spec,
                'StateTypeUpdate': state_type_update,
                'StateType': state_type,
                'TemporaryFileSpec': temporary_file_spec,
                'TemporaryFile': temporary_file,
                'TranscodeSpec': transcode_spec,
                'Transcode': transcode,
                'UserUpdate': user_update,
                'User': user,
                'VersionSpec': version_spec,
                'VersionUpdate': version_update,
                'Version': version,
                'VideoDefinition': video_definition,
                'AttributeBulkUpdate': attribute_bulk_update,
                'RgbColor': rgb_color,
                'RgbaColor': rgba_color,
                'HexColor': hex_color,
                'Color': color,
                'AlphaRange': alpha_range,
                'ColorMap': color_map,
                'CreateResponse': create_response,
                'CreateListResponse': create_list_response,
                'MessageResponse': message_response,
                'NotFoundResponse': not_found_response,
                'BadRequestResponse': bad_request_response,
                'Credentials': credentials,
                'Token': token,
            },
        }

        # Add schema for Token endpoint.
        if not parser:
            schema['paths']['/rest/Token']['post']['requestBody'] = {
                'content': {'application/json': {
                    'schema': {'$ref': '#/components/schemas/Credentials'},
                }},
            }
            schema['paths']['/rest/Token']['post']['responses'] = {
                '200': {
                    'description': 'Login credentials accepted.',
                    'content': {'application/json': {'schema': {
                        '$ref': '#/components/schemas/Token',
                    }}},
                },
                400: {'description': 'Login credentials invalid.'},
            }
            schema['paths']['/rest/Token']['post']['tags'] = ['Tator']

            # Set security scheme.
            schema['components']['securitySchemes'] = {
                'TokenAuth': {
                    'type': 'apiKey',
                    'in': 'header',
                    'name': 'Authorization',
                },
            }
            schema['security'] = [
                {'TokenAuth': []},
            ]

            # Remove deprecated paths.
            deprecated = [
                '/rest/EntityTypeMedias/{project}',
                '/rest/EntityTypeMedia/{id}',
                '/rest/EntityMedia/{id}',
                '/rest/EntityMedias/{project}',
                '/rest/EntityState/{id}',
                '/rest/EntityStates/{project}',
                '/rest/EntityStateTypes/{project}',
                '/rest/EntityStateType/{id}',
                '/rest/TreeLeafTypes/{project}',
                '/rest/TreeLeafType/{id}',
                '/rest/TreeLeaves/{project}',
                '/rest/TreeLeaf/{id}',
                '/rest/TreeLeaves/Suggestion/{ancestor}/{project}',
            ]
            for d in deprecated:
                if d in schema['paths']:
                    del schema['paths'][d]

        return schema

