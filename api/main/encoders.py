from django.core.serializers.json import DjangoJSONEncoder
from django_ltree.fields import PathValue


class TatorJSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, PathValue):
            return str(obj)
        return super().default(obj)
