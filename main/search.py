import logging
import os
from copy import deepcopy
from elasticsearch import Elasticsearch

logger = logging.getLogger(__name__)

# Used for duplicate ID storage
id_bits=448
id_mask=(1 << id_bits) - 1

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
        """ Indicies an element into ES """
        docs = self.build_document(entity, 'single')
        for doc in docs:
            logger.info(f"Making Doc={doc}")
            res = self.es.index(index=self.index_name(entity.project.pk),
                                id=doc['_id'],
                                refresh=wait,
                                routing=1,
                                body={**doc['doc']})

    def build_document(self, entity, mode='create'):
        """ Returns a list of documents representing the entity to be
            used with the es.helpers.bulk functions
            if mode is 'single', then one can use the 'doc' member
            as the parameters to the es.index function.
        """
        aux = {}
        aux['_meta'] = entity.meta.pk
        aux['_dtype'] = entity.meta.dtype
        duplicates = []
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
        elif entity.meta.dtype in ['state']:
            media = entity.association.media.all()
            if media.exists():
                aux['_media_relation'] = {
                    'name': 'annotation',
                    'parent': media[0].pk,
                }
                for media_idx in range(1, media.count()):
                    duplicate = deepcopy(aux)
                    duplicate['_media_relation'] = {
                        'name': 'annotation',
                        'parent': media[media_idx].pk,
                        }
                    duplicates.append(duplicate)
            try:
                # If the state has an extracted image, its a
                # duplicated entry in ES.
                extracted_image = entity.association.extracted
                if extracted_image:
                    duplicate = deepcopy(aux)
                    duplicate['_media_relation'] = {
                        'name': 'annotation',
                        'parent': extracted_image.pk,
                        }
                    duplicates.append(duplicate)
            except:
                pass
        elif entity.meta.dtype in ['treeleaf']:
            aux['_exact_treeleaf_name'] = entity.name
            aux['tator_treeleaf_name'] = entity.name
            aux['_treeleaf_depth'] = entity.depth()
            aux['_treeleaf_path'] = entity.computePath()
        if entity.attributes is None:
            entity.attributes = {}
            entity.save()

        corrected_attributes={**entity.attributes}
        if mode != 'single':
            for key in corrected_attributes:
                value=corrected_attributes[key]
                # Store django lat/lon as a string
                if type(value) == list:
                    corrected_attributes[key] = f"{value[0]},{value[1]}"
        results=[]
        results.append({
            '_index':self.index_name(entity.project.pk),
            '_op_type': mode,
            'doc': {**corrected_attributes,
                    **aux},
            '_id': entity.pk,
            '_routing': 1,
        })

        # Load in duplicates, if any
        for idx,duplicate in enumerate(duplicates):
            # duplicate_id needs to be unique we use the upper
            # 8 bits of the id field to indicate which duplicate
            # it is. This won't create collisions until there are
            # more than 2^256 elements in the database or more than
            # 256 duplicates for a given type
            duplicate_id = entity.pk + ((idx + 1) << id_bits)
            results.append({
            '_index':self.index_name(entity.project.pk),
            '_op_type': mode,
            'doc': {**corrected_attributes,
                    **duplicate},
            '_id': duplicate_id,
            '_routing': 1,
            })
        return results


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
        size = query.get('size', None)
        if (size is None) or (size >= 10000):
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
            if size:
                count = size
            ids = set(int(obj['_id']) & id_mask for obj in data)
            while len(ids) < count:
                result = self.es.scroll(
                    scroll_id=scroll_id,
                    scroll='1m',
                )
                ids.union(set(int(obj['_id']) & id_mask for obj in result['hits']['hits']))
            self.es.clear_scroll(scroll_id)
        else:
            result = self.search_raw(project, query)
            result = result['hits']
            data = result['hits']
            count = result['total']['value']
            ids = set(int(obj['_id']) & id_mask for obj in data)
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
