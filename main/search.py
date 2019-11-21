import logging

from elasticsearch import Elasticsearch

from main.models import *

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
        if isinstance(entity_type, EntityTypeMediaBase):
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
        if isinstance(attribute_type, AttributeTypeBool):
            dtype='boolean'
        elif isinstance(attribute_type, AttributeTypeInt):
            dtype='integer'
        elif isinstance(attribute_type, AttributeTypeFloat):
            dtype='float'
        elif isinstance(attribute_type, AttributeTypeEnum):
            dtype='text'
        elif isinstance(attribute_type, AttributeTypeString):
            dtype='text'
        elif isinstance(attribute_type, AttributeTypeDatetime):
            dtype='date'
        elif isinstance(attribute_type, AttributeTypeGeoposition):
            dtype='geo_point'
        self.es.indices.put_mapping(
            index=self.index_name(attribute_type.applies_to.pk),
            body={'properties': {
                attribute_type.name: {'type': dtype},
            }},
        )

    def create_document(self, entity):
        aux = {}
        if isinstance(entity, EntityMediaBase):
            aux['name'] = entity.name
        if hasattr(entity, 'related_media'):
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

    def search(self, project_id, query):
        entity_type_qs = EntityTypeBase.objects.filter(project=project_id)
        indices = [f'entity_type_{entity_type.pk}' for entity_type in entity_type_qs]
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
