from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter

from main.token_auth import TokenAuthMiddlewareStack
import main.routing

application = ProtocolTypeRouter({
    'websocket': TokenAuthMiddlewareStack(
        URLRouter(
            main.routing.websocket_urlpatterns
        )
    ),
})

