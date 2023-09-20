import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..notify import Notify
from ..schema import NotifySchema
from ..schema import parse

logger = logging.getLogger(__name__)


class NotifyAPI(APIView):
    """Send a notification to administrators.

    Uses the Slack API to send a notification to system administrators. This
    endpoint can only be used by system administrators and must be configured
    in a Tator deployment's settings.
    """

    schema = NotifySchema()

    def post(self, request, format=None, **kwargs):
        response = Response({"message": "Not Found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            params = parse(request)

            send_as_file = params.get("send_as_file", 0)

            response = None
            if send_as_file:
                response = Notify.notify_admin_file(
                    f"Message from {request.user}", params["message"]
                )
            else:
                response = Notify.notify_admin_msg(f"_{request.user}_ : {params['message']}")

            if response:
                response = Response({"message": "Processed"}, status=status.HTTP_200_OK)
            else:
                response = Response(
                    {"message": "Not Processed"}, status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
        except Exception:
            logger.error(
                "Encountered exception in %s", f"{type(self).__name__}.post", exc_info=True
            )
            response = Response({"message": "Bad request"}, status=status.HTTP_400_BAD_REQUEST)
        return response
