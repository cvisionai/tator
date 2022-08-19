from django.views import View
from django.views.generic.base import TemplateView
from django.shortcuts import render
from django.shortcuts import redirect
from django.shortcuts import get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from ipware import get_client_ip

from django.template.response import TemplateResponse
from rest_framework.authentication import TokenAuthentication
import yaml

from .models import Dashboard
from .models import Organization
from .models import Project
from .models import Media
from .models import Membership
from .models import Affiliation
from .models import Invitation
from .models import User
from .notify import Notify
from .cache import TatorCache

import os
import logging

import sys
import traceback

# Load the main.view logger
logger = logging.getLogger(__name__)


class APIBrowserView(LoginRequiredMixin, TemplateView):
    template_name = 'browser.html'
    extra_context = {'schema_url': 'schema'}

class LoginRedirect(View):
    def dispatch(self, request, *args, **kwargs):
        """ Redirects SAML logins to the IdP and caches the next url """
        if settings.SAML_ENABLED:
            url = settings.SAML_SSO_URL

            try:
                client_ip, _ = get_client_ip(request)
                if client_ip:
                    next_url = getattr(request, request.method).get('next')
                    if next_url:
                        TatorCache().set_saml_next_url(client_ip, next_url)
            except:
                logger.warning("Unable to cache 'next' query parameter", exc_info=True)
        else:
            url = "accounts/login"
        return redirect(url)

class MainRedirect(View):
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            # Default redirect is to projects
            out = redirect('projects')

            # If SAML login, try to get the 'next' url from the cache, but fall back to default
            # redirect above if there isn't one
            if settings.SAML_ENABLED:
                try:
                    client_ip, _ = get_client_ip(request)
                    if client_ip:
                        tc = TatorCache()
                        next_url = tc.get_saml_next_url(client_ip)
                        if next_url:
                            out = redirect(next_url)
                            tc.delete_saml_next_url(client_ip)
                except:
                    logger.warning("Unable to retrieve 'next' url", exc_info=True)
        else:
            if settings.COGNITO_ENABLED == 'TRUE':
                with open('/cognito/cognito.yaml', 'r') as f:
                    config = yaml.safe_load(f)
                out = redirect(f"https://{config['domain']}/login"
                               f"?client_id={config['client-id']}"
                               "&response_type=code&scope=openid"
                               f"&redirect_uri=https://{settings.MAIN_HOST}/jwt-gateway")
            else:
                out = redirect('redirect/login')
        return out

class RegistrationView(TemplateView):
    template_name = 'registration/registration.html'

class AcceptView(TemplateView):
    template_name = 'registration/accept.html'
    def dispatch(self, request, *args, **kwargs):
        if 'registration_token' in request.GET:
            invites = Invitation.objects.filter(registration_token=request.GET['registration_token'],
                                                status='Pending')
            if invites.count() == 0:
                return HttpResponse(status=403)
            else:
                invite = invites[0]
                user = User.objects.filter(email=invite.email)
                if user.count() == 0:
                    return HttpResponse(status=403)
                user = user[0]
                Affiliation.objects.create(organization=invite.organization,
                                           permission=invite.permission,
                                           user=user)
                invite.status = "Accepted"
                invite.save()
        else:
            return HttpResponse(status=403)
        return super().dispatch(request, *args, **kwargs)

class PasswordResetRequestView(TemplateView):
    template_name = 'password-reset/password-reset-request.html'

class PasswordResetView(TemplateView):
    template_name = 'password-reset/password-reset.html'

class OrganizationsView(LoginRequiredMixin, TemplateView):
    template_name = 'organizations.html'

class ProjectsView(LoginRequiredMixin, TemplateView):
    template_name = 'projects.html'

class AccountProfileView(LoginRequiredMixin, TemplateView):
    template_name = 'account-profile/account-profile.html'

class TokenView(LoginRequiredMixin, TemplateView):
    template_name = 'token.html'

class ProjectBase(LoginRequiredMixin):

    def get_context_data(self, **kwargs):
        # Get project info.
        context = super().get_context_data(**kwargs)
        project = get_object_or_404(Project, pk=self.kwargs['project_id'])
        context['project'] = project

        # Check if user is part of project.
        if not project.has_user(self.request.user.pk):
            raise PermissionDenied
        return context


class ProjectDetailView(ProjectBase, TemplateView):
    template_name = 'project-detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        token, _ = Token.objects.get_or_create(user=self.request.user)
        context['token'] = token
        return context

class StreamSaverSWLocal(ProjectBase, TemplateView):
    def get(self, *args, **kwargs):
        # response = HttpResponse()
        response = TemplateResponse(self.request, 'stream-saver/sw.js', {}, 'application/javascript')
        del response.headers["X-Frame-Options"]
        del response.headers["Cross-Origin-Embedder-Policy"]
        response.headers["Content-Type"] = 'application/javascript'
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"

        return response

class StreamSaverMITMLocal(ProjectBase, TemplateView):
    def get(self, *args, **kwargs):
        # response = HttpResponse()
        response = TemplateResponse(self.request, 'stream-saver/mitm.html', {})
        del response.headers["X-Frame-Options"]
        del response.headers["Cross-Origin-Embedder-Policy"]
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"

        return response

class ProjectSettingsView(ProjectBase, TemplateView):
    template_name = 'project-settings.html'

class OrganizationSettingsView(LoginRequiredMixin, TemplateView):
    template_name = 'organization-settings.html'

    def get_context_data(self, **kwargs):
        # Get organization info.
        context = super().get_context_data(**kwargs)
        organization = get_object_or_404(Organization, pk=self.kwargs['organization_id'])
        context['organization'] = organization
        context['email_enabled'] = settings.TATOR_EMAIL_ENABLED

        # Check if user is part of project.
        if organization.user_permission(self.request.user.pk) != 'Admin':
            raise PermissionDenied
        return context

class DashboardPortalView(ProjectBase, TemplateView):
    template_name = 'analytics/dashboard-portal.html'


class DashboardView(ProjectBase, TemplateView):
    template_name = 'analytics/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        dashboard = get_object_or_404(Dashboard, pk=self.kwargs['id'])
        context['dashboard'] = dashboard
        return context


class FilesView(ProjectBase, TemplateView):
    template_name = 'analytics/files.html'


class AnalyticsLocalizationsView(ProjectBase, TemplateView):
    template_name = 'analytics/localizations.html'

class AnalyticsCorrectionsView(ProjectBase, TemplateView):
    template_name = 'analytics/corrections.html'

class AnalyticsCollectionsView(ProjectBase, TemplateView):
    template_name = 'analytics/collections.html'

class AnalyticsPortalView(ProjectBase, TemplateView):
    template_name = 'analytics/portal.html'

class AnnotationView(ProjectBase, TemplateView):
    template_name = 'annotation.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        media = get_object_or_404(Media, pk=self.kwargs['id'])
        context['media'] = media
        return context


def validate_project(user, project):
    # We only cache 'True' effectively with this logic
    granted = TatorCache().get_cred_cache(user.id, project.id)
    if granted:
        return granted

    if isinstance(user, AnonymousUser):
        granted = False
    else:
        # Find membership for this user and project
        membership = Membership.objects.filter(
            user=user,
            project=project
        )

        # If user is not part of project, deny access
        if membership.count() == 0:
            granted = False
        else:
            # Only cache granted attempts
            granted = True
            TatorCache().set_cred_cache(user.id, project.id, granted)
    return granted


class AuthProjectView(View):
    def dispatch(self, request, *args, **kwargs):
        """ Identifies permissions for a file in /media
        User must be part of the project to access media files.
        Returns 200 on OK, returns 403 on Forbidden
        """

        original_url = request.headers['X-Original-URI']

        # For some reason, TokenAuthentication doesn't work by default
        # So if the session authentication didn't trigger, manually check
        # to see if a token was provided. Bail out if the user is anonymous
        # before we get too far
        user = request.user
        if isinstance(user, AnonymousUser):
            try:
                (user, token) = TokenAuthentication().authenticate(request)
            except Exception as e:
                msg = "*Security Alert:* "
                msg += f"Bad credentials presented for '{original_url}' ({user})"
                Notify.notify_admin_msg(msg)
                logger.warn(msg)
                return HttpResponse(status=403)

        filename = os.path.basename(original_url)

        project = None
        try:
            comps = original_url.split('/')
            project_id = comps[2]
            if project_id.isdigit() is False:
                project_id = comps[3]
            project = Project.objects.get(pk=project_id)
            authorized = validate_project(user, project)
        except Exception as e:
            logger.info(f"ERROR: {e}")
            authorized = False

        if authorized:
            return HttpResponse(status=200)
        else:
            # Files that aren't in the whitelist or database are forbidden
            msg = f"({user}/{user.id}): "
            msg += f"Attempted to access unauthorized file '{original_url}'"
            msg += f". "
            msg += f"Does not have access to '{project}'"
            Notify.notify_admin_msg(msg)
            return HttpResponse(status=403)

        return HttpResponse(status=403)


class AuthAdminView(View):
    def dispatch(self, request, *args, **kwargs):
        """ Identifies permissions for an nginx location requiring admin
        User must have the is_staff flag enabled.
        Returns 200 on OK, returns 403 on Forbidden
        """
        original_url = request.headers['X-Original-URI']

        # For some reason, TokenAuthentication doesn't work by default
        # So if the session authentication didn't trigger, manually check
        # to see if a token was provided. Bail out if the user is anonymous
        # before we get too far
        user = request.user
        if isinstance(user, AnonymousUser):
            try:
                (user, token) = TokenAuthentication().authenticate(request)
            except Exception as e:
                msg = "*Security Alert:* "
                msg += f"Bad credentials presented for '{original_url}'"
                Notify.notify_admin_msg(msg)
                return HttpResponse(status=403)

        if user.is_staff:
            return HttpResponse(status=200)
        else:
            # Files that aren't in the whitelist or database are forbidden
            msg = f"({user}/{user.id}): "
            msg += f"Attempted to access unauthorized URL '{original_url}'"
            msg += f"."
            Notify.notify_admin_msg(msg)
            return HttpResponse(status=403)

        return HttpResponse(status=403)


def ErrorNotifierView(request, code, message, details=None):

    context = {}
    context['code'] = code
    context['msg'] = message
    context['details'] = details
    response = render(request, 'error-page.html', context=context)
    response.status_code = code

    # Generate slack message
    if Notify.notification_enabled():
        msg = f"{request.get_host()}:"
        msg += f" ({request.user}/{request.user.id})"
        msg += f" caused {code} at {request.get_full_path()}"
        if details:
            Notify.notify_admin_file(msg, msg + '\n' + details)
        else:
            if code == 404 and isinstance(request.user, AnonymousUser):
                logger.warn(msg)
            else:
                Notify.notify_admin_msg(msg)

    return response


def NotFoundView(request, exception=None):
    return ErrorNotifierView(request, 404, "Not Found")


def PermissionErrorView(request, exception=None):
    return ErrorNotifierView(request, 403, "Permission Denied")


def ServerErrorView(request, exception=None):
    e_type, value, tb = sys.exc_info()
    error_trace = traceback.format_exception(e_type, value, tb)
    return ErrorNotifierView(request,
                             500,
                             "Server Error",
                             ''.join(error_trace))
