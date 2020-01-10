from django.conf.urls import url

from .consumers import ProgressConsumer

websocket_urlpatterns = [
    url('ws/progress/', ProgressConsumer),
]
