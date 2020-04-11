from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.views import APIView

from ..notify import Notify

class NotifyAPI(APIView):
    """
    Send a notification to administrators
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='message',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A message to send to administrators')),
        coreapi.Field(name='sendAsFile',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Send message as file'))
    ])
    def post(self, request, format=None, **kwargs):
        response=Response({'message' : str("Not Found")},
                              status=status.HTTP_404_NOT_FOUND)
        try:
            reqObject=request.data

            if 'message' not in reqObject:
                raise Exception("Missing 'message' argument.")

            send_as_file = reqObject.get('sendAsFile', False)

            response = None
            if send_as_file:
                response = Notify.notify_admin_file(f"Message from {request.user}", reqObject['message'])
            else:
                response = Notify.notify_admin_msg(f"_{request.user}_ : {reqObject['message']}")

            if response == True:
                response=Response({'message' : "Processed"},
                                  status=status.HTTP_200_OK)
            else:
                response=Response({'message': "Not Processed"},
                                  status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response

