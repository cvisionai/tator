from django.conf.urls import url

from .consumers import Transcoder
from .consumers import Packager
from .consumers import Algorithm
from .consumers import ProgressConsumer

websocket_urlpatterns = [
    url('ws/progress/', ProgressConsumer),
]

channel_urlpatterns = {
    'transcoder': Transcoder,
    'packager': Packager,
		'algorithm': Algorithm,
}
