from uuid import uuid1
import base64
import magic
import mimetypes
import logging

from django.db import transaction
from django.conf import settings
from rest_framework.exceptions import ValidationError
from rest_framework.utils.serializer_helpers import ReturnList

from ..models import User
from ..models import Invitation
from ..models import Affiliation
from ..models import PasswordReset
from ..serializers import UserSerializerBasic
from ..mail import get_email_service
from ..schema import UserExistsSchema
from ..schema import UserListSchema
from ..schema import UserDetailSchema
from ..schema import CurrentUserSchema
from ..store import get_tator_store

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import UserPermission
from ._permissions import UserListPermission

logger = logging.getLogger(__name__)

MAX_PROFILE_IMAGE_SIZE = 1*1024*1024
ACCEPTABLE_PROFILE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png']

def handle_profile_management(user, params):
    new_avatar = params.get('new_avatar', None)
    clear_avatar = params.get('clear_avatar', 0)
    set_profile_keys = params.get('set_profile_keys', {})
    clear_profile_keys = params.get('clear_profile_keys', [])

    generic_store = get_tator_store()
    existing_avatar = user.profile.get('avatar')


    # Handle keys
    if set_profile_keys:
        for key,value in set_profile_keys.items():
            user.profile[key] = value
        user.save()

    if clear_profile_keys:
        for key in clear_profile_keys:
            if key in user.profile:
                del user.profile[key]
        user.save()

    # Handle deleting an avatar
    if clear_avatar and existing_avatar:
        if existing_avatar.startswith(f'user_data/{user.pk}'):
            generic_store.delete_object(existing_avatar)
            del user.profile['avatar']
            user.save()
        else:
            raise ValueError(f"Unable to clear avatar image")

    if new_avatar:
        img_data = base64.b64decode(new_avatar)
        if len(img_data) > MAX_PROFILE_IMAGE_SIZE:
            raise ValueError(f"Supplied profile image is too large {len(img_data)} > {MAX_PROFILE_IMAGE_SIZE}")
        mime_type = magic.from_buffer(img_data, mime=True)
        if not mime_type in ACCEPTABLE_PROFILE_IMAGE_MIME_TYPES:
            raise ValueError(f'Supplied image is not an acceptable mime format {mime_type}')

        if existing_avatar:
            if existing_avatar.startswith(f'user_data/{user.pk}'):
                generic_store.delete_object(existing_avatar)
                del user.profile['avatar']
            else:
                raise ValueError(f"Unable to clear old avatar image")
        file_extension = mimetypes.guess_extension(mime_type)
        avatar_keypath = f"user_data/{user.pk}/avatar{file_extension}"
        generic_store.put_object(avatar_keypath, img_data)
        user.profile['avatar'] = avatar_keypath
        user.save()

def user_serializer_helper(response_data, presigned_ttl):
    """ Presign any object keys provided in the user object
        :param presigned_ttl: Number of seconds to presign the object.
    """
    if presigned_ttl == None:
        return response_data
    generic_store = get_tator_store()
 
    if type(response_data) == ReturnList:
        for row in response_data:
            avatar_key = row['profile'].get('avatar')
            if avatar_key:
                row['profile']['avatar'] = generic_store.get_download_url(avatar_key, presigned_ttl)
            else:
                row['profile']['avatar'] = None
    else:
        avatar_key = response_data['profile'].get('avatar')
        if avatar_key:
            response_data['profile']['avatar'] = generic_store.get_download_url(avatar_key, presigned_ttl)
        else:
            response_data['profile']['avatar'] = None
    return response_data

class UserExistsAPI(BaseDetailView):
    """ Determine whether user exists.
    """
    schema = UserExistsSchema()
    queryset = User.objects.all()
    http_method_names = ['get']
    # This endpoint does not require authentication.

    def _get(self, params):
        email = params.get('email', None)
        username = params.get('username', None)
        elemental_id = params.get('elemental_id', None)
        if email is None and username is None and elemental_id is None:
            raise Exception("One of username or email must be supplied!")
        if email is not None:
            users = User.objects.filter(email=email)
        if username is not None:
            users = User.objects.filter(username__iexact=username)
        if elemental_id is not None:
            users = User.objects.filter(elemental_id=elemental_id)
        return users.exists()

class UserListAPI(BaseListView):
    """ Get list of users.
    """
    schema = UserListSchema()
    queryset = User.objects.all()
    permission_classes = [UserListPermission]
    http_method_names = ['get', 'post']

    def _get(self, params):
        email = params.get('email', None)
        username = params.get('username', None)
        elemental_id = params.get('elemental_id', None)
        if email is None and username is None and elemental_id is None:
            raise Exception("One of username or email or elemental_id must be supplied!")
        if email is not None:
            users = User.objects.filter(email=email)
        if username is not None:
            users = User.objects.filter(username__iexact=username)
        if elemental_id is not None:
            users = User.objects.filter(elemental_id=elemental_id)
        return user_serializer_helper(UserSerializerBasic(users, many=True).data, params.get('presigned', None))

    def _post(self, params):
        first_name = params['first_name']
        last_name = params['last_name']
        email = params['email']
        username = params['username']
        password = params['password']
        registration_token = params.get('registration_token')

        # Case-insensitive check on username existence
        if User.objects.filter(username__iexact=username).count() > 0:
            raise ValueError(f"Username is already taken!")

        if registration_token is None:
            # This is an anonymous registration, check to see if this is allowed.
            if settings.ANONYMOUS_REGISTRATION_ENABLED:
                # Create a user.
                user = User(first_name=first_name,
                            last_name=last_name,
                            email=email,
                            username=username)
                if settings.EMAIL_CONFIRMATION_REQUIRED:
                    if settings.TATOR_EMAIL_ENABLED:
                        user.is_active = False
                        user.confirmation_token = uuid1()
                        # Send email
                        get_email_service().email(
                            sender=settings.TATOR_EMAIL_SENDER,
                            recipients=[email],
                            title="Tator email confirmation",
                            text="To confirm your email address and complete registration with "
                                 "Tator, please visit or click the following link: "
                                 "{os.getenv('MAIN_HOST')}/email-confirmation/{user.confirmation_token}",
                            raise_on_failure=f"Unable to send email to {email}! User creation failed.",
                        )
                    else:
                        raise ValueError("Cannot enable email confirmation without email service!")
                user.set_password(password)
                user.save()
            else:
                raise ValueError("Registration token must be supplied in URL!")
        else:
            # A registration token has been supplied, use it to find Invitation objects.
            invites = Invitation.objects.filter(registration_token=registration_token,
                                                status='Pending')
            if invites.count() == 0:
                raise ValueError("Registration token is expired or invalid!")
            else:
                invite = invites[0]
                if (invite.email.lower() != email.lower()):
                    raise ValueError("Email address must match where registration token was sent!")
                user = User(first_name=first_name,
                            last_name=last_name,
                            email=email,
                            username=username)
                user.set_password(password)
                user.save()
                invite.status = "Accepted"
                invite.save()
                Affiliation.objects.create(organization=invite.organization,
                                           permission=invite.permission,
                                           user=user)

        handle_profile_management(user, params)

        return {'message': f"User {username} created!",
                'id': user.id}

class UserDetailAPI(BaseDetailView):
    """ Interact with an individual user.
    """
    schema = UserDetailSchema()
    queryset = User.objects.all()
    permission_classes = [UserPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch']

    def _get(self, params):
        user = User.objects.get(pk=params['id'])
        return user_serializer_helper(UserSerializerBasic(user).data, params.get('presigned', None))

    @transaction.atomic
    def _patch(self, params):
        user = User.objects.get(pk=params['id'])
        if user.username == 'anonymous':
            raise RuntimeError(f'Anonymous user cannot be modified!')
        if 'first_name' in params:
            user.first_name = params['first_name']
        if 'last_name' in params:
            user.last_name = params['last_name']
        if 'email' in params:
            #if there was an update, check it isn't another user first
            if params['email'] != user.email:
                existing = User.objects.filter(email=params['email'])
                if existing.count() > 0:
                    raise RuntimeError(f"User with email {params['email']} already exists!")
                user.email = params['email']
        if 'password' in params:
            if 'reset_token' not in params:
                raise RuntimeError(f"Password cannot be changed without reset token!")
            resets = PasswordReset.objects.filter(reset_token=params['reset_token'],
                                                  user=user)
            if resets.count() == 0:
                raise ValueError("Reset token is expired or invalid!")
            else:
                user.set_password(params['password'])
                user.failed_login_count = 0
        user.save()

        handle_profile_management(user, params)
        user = User.objects.get(pk=params['id'])
        return {'message': f'Updated user {params["id"]} successfully!'}

class CurrentUserAPI(BaseDetailView):
    """ Returns the current user.

        This is the equivalent of a whoami() operation.
    """
    schema = CurrentUserSchema()
    http_method_names = ['get']

    def _get(self, params):
        user = User.objects.get(pk=self.request.user.pk)
        return user_serializer_helper(UserSerializerBasic(user).data, params.get('presigned', None))
