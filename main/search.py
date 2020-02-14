import logging
import os

from elasticsearch import Elasticsearch

logger = logging.getLogger(__name__)

class TatorSearch:
    """ Interface for elasticsearch documents.
        There is one index per entity type.
        There is one mapping per attribute type.
        There is one document per entity.
    """
    @classmethod
    def setup_elasticsearch(cls):
        cls.prefix = os.getenv('ELASTICSEARCH_PREFIX')
        if cls.prefix is None:
            cls.prefix = ''
        cls.es = Elasticsearch([os.getenv('ELASTICSEARCH_HOST')])

    def index_name(self, project):
        return f'{self.prefix}project_{project}'

    def create_index(self, project):
        index = self.index_name(project)
        if not self.es.indices.exists(index):
            self.es.indices.create(
                index,
                body={
                    'settings': {
                        'number_of_shards': 1,
                        'number_of_replicas': 1,
                    },
                    'mappings': {
                        'properties': {
                            '_media_relation': {
                                'type': 'join',
                                'relations': {
                                    'media': 'annotation',
                                }
                            },
                            'tator_media_name': {'type': 'text'},
                            '_exact_name': {'type': 'keyword'},
                            '_md5': {'type': 'keyword'},
                            '_meta': {'type': 'integer'},
                            '_dtype': {'type': 'text'},
                            'tator_user_sections': {'type': 'keyword'},
                        }
                    },
                },
            )
        # Mappings that were added later
        self.es.indices.put_mapping(
            index=index,
            body={'properties': {
                '_exact_treeleaf_name': {'type': 'keyword'},
                'tator_treeleaf_name': {'type': 'text'},
                '_treeleaf_depth': {'type': 'integer'},
                '_treeleaf_path': {'type': 'text'},
                '_annotation_version': {'type': 'integer'},
                '_modified': {'type': 'boolean'},
                '_modified_datetime': {'type': 'date'},
                '_modified_by': {'type': 'keyword'},
            }},
        )

    def delete_index(self, project):
        index = self.index_name(project)
        if self.es.indices.exists(index):
            self.es.indices.delete(index)

    def create_mapping(self, attribute_type):
        if attribute_type.dtype == 'bool':
            dtype='boolean'
        elif attribute_type.dtype == 'int':
            dtype='integer'
        elif attribute_type.dtype == 'float':
            dtype='float'
        elif attribute_type.dtype == 'enum':
            dtype='text'
        elif attribute_type.dtype == 'str':
            dtype='text'
        elif attribute_type.dtype == 'datetime':
            dtype='date'
        elif attribute_type.dtype == 'geopos':
            dtype='geo_point'
        self.es.indices.put_mapping(
            index=self.index_name(attribute_type.project.pk),
            body={'properties': {
                attribute_type.name: {'type': dtype},
            }},
        )

    def create_document(self, entity, wait=False):
        aux = {}
        aux['_meta'] = entity.meta.pk
        aux['_dtype'] = entity.meta.dtype
        if entity.meta.dtype in ['image', 'video']:
            aux['_media_relation'] = 'media'
            aux['tator_media_name'] = entity.name
            aux['_exact_name'] = entity.name
            aux['_md5'] = entity.md5
            if entity.attributes is not None:
                if 'tator_user_sections' in entity.attributes:
                    aux['tator_user_sections'] = entity.attributes['tator_user_sections']
        elif entity.meta.dtype in ['box', 'line', 'dot']:
            aux['_media_relation'] = {
                'name': 'annotation',
                'parent': entity.media.pk,
            }
            aux['_annotation_version'] = entity.version.pk
            aux['_modified'] = entity.modified
            aux['_modified_datetime'] = entity.modified_datetime.isoformat()
            aux['_modified_by'] = str(entity.modified_by)
        elif entity.meta.dtype in ['state']:
            media = entity.association.media.all()
            if media.exists():
                aux['_media_relation'] = {
                    'name': 'annotation',
                    'parent': media[0].pk,
                }
            aux['_annotation_version'] = entity.version.pk
            aux['_modified'] = entity.modified
            aux['_modified_datetime'] = entity.modified_datetime.isoformat()
            aux['_modified_by'] = str(entity.modified_by)
        elif entity.meta.dtype in ['treeleaf']:
            aux['_exact_treeleaf_name'] = entity.name
            aux['tator_treeleaf_name'] = entity.name
            aux['_treeleaf_depth'] = entity.depth()
            aux['_treeleaf_path'] = entity.computePath()
        if entity.attributes is None:
            entity.attributes = {}
            entity.save()
        self.es.index(
            index=self.index_name(entity.project.pk),
            body={
                **entity.attributes,
                **aux,
            },
            id=entity.pk,
            refresh=wait,
            routing=1,
        )

    def delete_document(self, entity):
        index = self.index_name(entity.project.pk)
        if self.es.exists(index=index, id=entity.pk):
            self.es.delete(index=index, id=entity.pk)

    def search_raw(self, project, query):
        return self.es.search(
            index=self.index_name(project),
            body=query,
            _source=False,
            stored_fields=[],
        )

    def search(self, project, query):
        if 'sort' not in query:
            query['sort'] = {'_doc': 'asc'}
        size = query.get('size', 10000)
        if size >= 10000:
            query['size'] = 10000
            result = self.es.search(
                index=self.index_name(project),
                body=query,
                scroll='1m',
                _source=False,
                stored_fields=[],
            )
            scroll_id = result['_scroll_id']
            result = result['hits']
            data = result['hits']
            count = result['total']['value']
            ids = [int(obj['_id']) for obj in data]
            while len(ids) < count:
                result = self.es.scroll(
                    scroll_id=scroll_id,
                    scroll='1m',
                )
                ids += [int(obj['_id']) for obj in result['hits']['hits']]
            self.es.clear_scroll(scroll_id)
        else:
            result = self.search_raw(project, query)
            result = result['hits']
            data = result['hits']
            count = result['total']['value']
            ids = [int(obj['_id']) for obj in data]
        return ids, count

    def count(self, project, query):
        index = self.index_name(project)
        return self.es.count(index=index, body=query)['count']

    def refresh(self, project):
        """Force refresh on an index.
        """
        self.es.indices.refresh(index=self.index_name(project))

    def delete(self, project, query):
        """Bulk delete on search results.
        """
        self.es.delete_by_query(
            index=self.index_name(project),
            body=query,
            conflicts='proceed',
        )

    def update(self, project, query, attrs):
        """Bulk update on search results.
        """
        query['script'] = ''
        for key in attrs:
            val = attrs[key]
            if isinstance(val, bool):
                if val:
                    val = 'true'
                else:
                    val = 'false'
            query['script'] += f"ctx._source.{key}='{val}';"
        self.es.update_by_query(
            index=self.index_name(project),
            body=query,
            conflicts='proceed',
        )

TatorSearch.setup_elasticsearch()
