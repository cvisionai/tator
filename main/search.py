from elasticsearch import Elasticsearch

from main.models import *

class TatorSearch:
    """ Interface for elasticsearch documents.
        There is one index per entity type.
        There is one mapping per attribute type.
        There is one document per entity.
    """
    @classmethod
    def setup_elasticsearch(cls):
        cls.es = Elasticsearch(host='elasticsearch-master')

    def create_index(self, entity_type):
        index = f'entity_type_{entity_type.pk}'
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
            index=f'entity_type_{attribute_type.applies_to.pk}',
            body={'properties': {
                attribute_type.name: {'type': dtype},
            }},
        )

    def create_document(self, entity):
        aux = {}
        if isinstance(entity, EntityMediaBase):
            aux = {'name': entity.name}
        self.es.index(
            index=f'entity_type_{entity.meta.pk}',
            body={
                **entity.attributes,
                **aux,
            },
            id=entity.pk,
        )

    def search(self, project_id, query):
        entity_type_qs = EntityTypeBase.objects.filter(project=project_id)
        indices = [f'entity_type_{entity_type.pk}' for entity_type in entity_type_qs]
        self.es.search(
            index=indices,
            q=query,
            _source=False,
        )

TatorSearch.setup_elasticsearch()
