import traceback
import logging
from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import Version
from ..models import Project
from ..serializers import VersionSerializer
from ..search import TatorSearch
from ..schema import VersionListSchema
from ..schema import VersionDetailSchema
from ..schema import parse

from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)

class VersionListAPI(APIView):
    """ Interact with a list of versions.

        Versions allow for multiple "layers" of annotations on the same media. Versions
        are created at the project level, but are only displayed for a given media
        if that media contains annotations in that version. The version of an annotation
        can be set by providing it in a POST operation. Currently only localizations
        and states can have versions.

        Versions are used in conjunction with the `modified` flag to determine whether
        an annotation should be displayed for a given media while annotating.
    """
    schema = VersionListSchema()
    serializer_class = VersionSerializer
    queryset = Version.objects.all()
    permission_classes = [ProjectEditPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            name = params['name']
            description = params.get('description', None)
            project = params['project']

            number = max([obj.number for obj in Version.objects.filter(project=project)]) + 1

            obj = Version(
                name=name,
                description=description,
                number=number,
                project=Project.objects.get(pk=project),
                created_by=request.user,
            )
            obj.save()

            response=Response({'id': obj.id},
                              status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def get(self, request, format=None, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            media = params.get('media_id', None)
            project = params['project']

            qs = Version.objects.filter(project=project).order_by('number')
            data = self.serializer_class(
                qs,
                context=self.get_renderer_context(),
                many=True,
            ).data

            # Use elasticsearch to find annotation stats and last modification date/user
            query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
            if media:
                query['query']['bool']['filter'] = []
                query['query']['bool']['filter'].append({
                    'has_parent': {
                        'parent_type': 'media',
                        'query': {'ids': {'values': [f'image_{media}', f'video_{media}']}},
                    },
                })
            query['query']['bool']['should'] = []
            query['query']['bool']['should'].append({
                'match': {'_modified': False},
            })
            query['query']['bool']['should'].append({
                'bool': {
                    'must_not': [{'exists': {'field': '_modified'}}],
                },
            })
            query['query']['bool']['minimum_should_match'] = 1
            query['aggs']['versions']['terms']['field'] = '_annotation_version'
            query['aggs']['versions']['aggs']['latest']['top_hits'] = {
                'sort': [{'_modified_datetime': {'order': 'desc'}}],
                '_source': {'includes': ['_modified_datetime', '_modified_by']},
                'size': 1,
            }
            created_aggs = TatorSearch().search_raw(project, query)
            created_aggs = created_aggs['aggregations']['versions']['buckets']
            query['query']['bool']['should'][0]['match']['_modified'] = True
            modified_aggs = TatorSearch().search_raw(project, query)
            modified_aggs = modified_aggs['aggregations']['versions']['buckets']

            # Convert to dictionary with id as keys
            data = {i['id']: i for i in data}
            created_aggs = {i['key']: i for i in created_aggs}
            modified_aggs = {i['key']: i for i in modified_aggs}

            # Copy annotation stats and modification dates into objects.
            for key in data:
                if key in created_aggs:
                    created_latest = created_aggs[key]['latest']['hits']['hits'][0]['_source']
                    data[key] = {
                        **data[key],
                        'num_created': created_aggs[key]['doc_count'],
                        'created_datetime': created_latest['_modified_datetime'],
                        'created_by': created_latest['_modified_by'],
                    }
                else:
                    data[key] = {
                        **data[key],
                        'num_created': 0,
                        'created_datetime': '---',
                        'created_by': '---',
                    }
                if key in modified_aggs:
                    modified_latest = modified_aggs[key]['latest']['hits']['hits'][0]['_source']
                    data[key] = {
                        **data[key],
                        'num_modified': modified_aggs[key]['doc_count'],
                        'modified_datetime': modified_latest['_modified_datetime'],
                        'modified_by': modified_latest['_modified_by'],
                    }
                else:
                    data[key] = {
                        **data[key],
                        'num_modified': 0,
                        'modified_datetime': '---',
                        'modified_by': '---',
                    }

            response = Response(list(data.values()), status=status.HTTP_200_OK)
        except ObjectDoesNotExist as dne:
            response = Response(
                {'message': str(dne)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            response = Response({
                'message': str(e),
                'details': traceback.format_exc(),
            }, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response

class VersionDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Interact with individual version.

        Versions allow for multiple "layers" of annotations on the same media. Versions
        are created at the project level, but are only displayed for a given media
        if that media contains annotations in that version. The version of an annotation
        can be set by providing it in a POST operation. Currently only localizations
        and states can have versions.

        Versions are used in conjunction with the `modified` flag to determine whether
        an annotation should be displayed for a given media while annotating.
    """
    schema = VersionDetailSchema()
    serializer_class = VersionSerializer
    queryset = Version.objects.all()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
