from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter
from channels.routing import ChannelNameRouter
from channels.auth import AuthMiddlewareStack

import main.routing

application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(
            main.routing.websocket_urlpatterns
        )
    ),
    'channel': ChannelNameRouter(
        main.routing.channel_urlpatterns
    ),
})
