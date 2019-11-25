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
            self.es.indices.create(
                index,
                body={
                    'settings': {
                        'number_of_shards': 1,
                        'number_of_replicas': 1,
                    },
                },
            )

        # If this is a media type, index other fields.
        if entity_type.dtype in ['image', 'video']:
            self.es.indices.put_mapping(
                index=index,
                body={
                    'properties': {
                        'name': {'type': 'text'},
                        'exact_name': {'type': 'keyword'},
                        'md5': {'type': 'text'},
                        'meta': {'type': 'integer'},
                        'tator_user_sections': {'type': 'keyword'},
                    },
                },
            )

        # If this is a media, localization, or state, index related_media.
        if entity_type.dtype in ['image', 'video', 'box', 'line', 'dot', 'state']:
            self.es.indices.put_mapping(
                index=index,
                body={
                    'properties': {
                        'related_media': {'type': 'integer'},
                    },
                },
            )


    def delete_index(self, entity_type):
        index = self.index_name(entity_type.pk)
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
            index=self.index_name(attribute_type.applies_to.pk),
            body={'properties': {
                attribute_type.name: {'type': dtype},
            }},
        )

    def create_document(self, entity, wait=False):
        aux = {}
        if entity.meta.dtype in ['image', 'video']:
            aux['name'] = entity.name
            aux['exact_name'] = entity.name
            aux['md5'] = entity.md5
            aux['meta'] = entity.meta.pk
            if entity.attributes is not None:
                if 'tator_user_sections' in entity.attributes:
                    aux['tator_user_sections'] = entity.attributes['tator_user_sections']
            aux['related_media'] = entity.pk
        elif entity.meta.dtype in ['box', 'line', 'dot']:
            aux['related_media'] = entity.media.pk
            aux['name'] = entity.media.name
            aux['exact_name'] = entity.media.name
        elif entity.meta.dtype in ['state']:
            media = entity.association.media.all()
            if media.exists():
                aux['related_media'] = media[0].pk
                aux['name'] = media[0].name
                aux['exact_name'] = media[0].name
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
            refresh=wait,
        )

    def delete_document(self, entity):
        index = self.index_name(entity.meta.pk)
        if self.es.exists(index=index, id=entity.pk):
            self.es.delete(index=index, id=entity.pk)

    def search_raw(self, entity_types, query):
        indices = [self.index_name(entity_type.pk) for entity_type in entity_types]
        return self.es.search(
            index=indices,
            body=query,
        )

    def search(self, entity_types, query):
        result = self.search_raw(entity_types, query)
        result = result['hits']
        data = result['hits']
        count = result['total']['value']
        if len(data) == 0:
            ids = []
        elif 'related_media' in data[0]['_source']:
            ids = [int(obj['_source']['related_media']) for obj in data]
        else:
            ids = [int(obj['_id']) for obj in data]
        return ids, count

    def refresh(self, entity_types):
        """Force refresh on an index.
        """
        indices = [self.index_name(entity_type.pk) for entity_type in entity_types]
        self.es.indices.refresh(index=indices)

    def delete(self, entity_types, query):
        """Bulk delete on search results.
        """
        indices = [self.index_name(entity_type.pk) for entity_type in entity_types]
        self.es.delete_by_query(
            index=indices,
            body=query,
            conflicts='proceed',
        )

TatorSearch.setup_elasticsearch()
