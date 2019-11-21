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
        cls.es = Elasticsearch(host='elasticsearch-master')

    def index_name(self, entity_type_id):
        return f'{self.prefix}entity_type_{entity_type_id}'

    def create_index(self, entity_type):
        index = self.index_name(entity_type.pk)
        if not self.es.indices.exists(index):
            self.es.indices.create(index)

        # If this is a media type, index the media name.
        if entity_type.dtype in ['image', 'video']:
            self.es.indices.put_mapping(
                index=index,
                body={'properties': {
                    'name': {'type': 'text'},
                }},
            )

    def delete_index(self, entity_type):
        index = self.index_name(entity_type.pk)
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
            index=self.index_name(attribute_type.applies_to.pk),
            body={'properties': {
                attribute_type.name: {'type': dtype},
            }},
        )

    def create_document(self, entity):
        aux = {}
        if entity.meta.dtype in ['image', 'video']:
            aux['name'] = entity.name
        if hasattr(entity, 'related_media'):
            if entity.related_media is not None:
                aux['related_media'] = entity.related_media.pk
        if entity.attributes is None:
            entity.attributes = {}
            entity.save()
        self.es.index(
            index=self.index_name(entity.meta.pk),
            body={
                **entity.attributes,
                **aux,
            },
            id=entity.pk,
        )

    def delete_document(self, entity):
        self.es.delete(
            index=self.index_name(entity.meta.pk),
            id=entity.pk,
        )

    def search(self, entity_types, query):
        indices = [f'entity_type_{entity_type.pk}' for entity_type in entity_types]
        result = self.es.search(
            index=indices,
            q=query,
            _source=False,
            stored_fields=[],
        )['hits']['hits']
        if len(result) == 0:
            return []
        elif hasattr(result[0], 'related_media'):
            return [int(obj['related_media']) for obj in result]
        else:
            return [int(obj['_id']) for obj in result]

TatorSearch.setup_elasticsearch()
