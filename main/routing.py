from django.conf.urls import url

from .consumers import Packager
from .consumers import ProgressConsumer

websocket_urlpatterns = [
    url('ws/progress/', ProgressConsumer),
]

channel_urlpatterns = {
    'packager': Packager,
}
