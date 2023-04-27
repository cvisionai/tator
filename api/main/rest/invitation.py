import uuid
import os
import logging

from django.db import transaction
from django.conf import settings
from django.http import Http404

from ..models import Invitation
from ..models import Organization
from ..models import Affiliation
from ..models import User
from ..models import database_qs
from ..schema import InvitationListSchema
from ..schema import InvitationDetailSchema
from ..schema.components import invitation as invitation_schema
from ..mail import get_email_service

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import OrganizationAdminPermission

logger = logging.getLogger(__name__)

INVITATION_PROPERTIES = list(invitation_schema['properties'].keys()).remove('created_username')

def _serialize_invitations(invitations):
    invitation_data = database_qs(invitations)
    for idx, invitation in enumerate(invitations):
        invitation_data[idx]['created_username'] = invitation.created_by.username
    invitation_data.sort(key=lambda invitation: invitation['created_datetime'])
    return invitation_data

class InvitationListAPI(BaseListView):
    """ Create or retrieve a list of project invitations.
    """
    schema = InvitationListSchema()
    permission_classes = [OrganizationAdminPermission]
    http_method_names = ['get', 'post']

    def _get(self, params):
        invites = Invitation.objects.filter(organization=params['organization'])
        return _serialize_invitations(invites)

    def _post(self, params):
        email = params['email']
        permission = params['permission']

        organization = Organization.objects.get(pk=params['organization'])
        existing = Invitation.objects.filter(organization=organization, email=email, status='Pending')
        if existing.exists():
            raise RuntimeError(f"Pending invitation already exists for organization {organization}, email {email}!")
        users = User.objects.filter(email=email)
        if users.count() > 1:
            raise RuntimeError(f"Multiple users exist with email {email}!")
        else:
            invite = Invitation(organization=organization,
                                email=email,
                                permission=permission,
                                created_by=self.request.user,
                                registration_token=uuid.uuid1())

            proto = settings.PROTO
            domain = self.request.get_host()
            if users.count() == 1:
                affiliations = Affiliation.objects.filter(user=users[0], organization=organization)
                if affiliations.count() > 0:
                    raise RuntimeError(f"Affiliation already exists for email {email}!")
                endpoint = "accept"
                action = "accept this invitation"
            else:
                endpoint = "registration"
                action = "create an account"

            url = f"{proto}://{domain}/{endpoint}?registration_token={invite.registration_token}"
            text = (
                f"You have been invited to collaborate with {organization} using Tator. "
                f"To {action}, please visit: \n\n{url}"
            )

            if settings.TATOR_EMAIL_ENABLED:
                get_email_service().email(
                    sender=settings.TATOR_EMAIL_SENDER,
                    recipients=[email],
                    title=f"Tator invitation from {organization}",
                    text=text,
                    raise_on_failure=f"Unable to send email to {email}! Invitation creation failed.",
                )
            invite.save()
        return {'message': f"User can register at {url}",
                'id': invite.id}

    def get_queryset(self):
        organization_id = self.kwargs['organization']
        invites = Invitation.objects.filter(organization=organization_id)
        return invites

class InvitationDetailAPI(BaseDetailView):
    """ Interact with an individual invitation.
    """
    schema = InvitationDetailSchema()
    permission_classes = [OrganizationAdminPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        invites = Invitation.objects.filter(pk=params['id'])
        if invites.count() == 0:
            raise Http404
        return _serialize_invitations(invites)[0]

    def _patch(self, params):
        invitation = Invitation.objects.get(pk=params['id']) 
        if 'permission' in params:
            invitation.permission = params['permission']
        if 'status' in params:
            invitation.status = params['status']
        invitation.save()
        return {'message': f"Invitation {params['id']} successfully updated!"}

    def _delete(self, params):
        Invitation.objects.get(pk=params['id']).delete()
        return {'message': f'Invitation {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Invitation.objects.all()
