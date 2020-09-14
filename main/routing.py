from django.conf.urls import url

from .consumers import ProgressConsumer

websocket_urlpatterns = [
    url('ws/progress/', ProgressConsumer)
]

websocket_token_urlpatterns = [
    url('ws/token-progress/', ProgressConsumer)
]