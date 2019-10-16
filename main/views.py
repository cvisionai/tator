from django.views import View
from django.views.generic.base import TemplateView
from django.shortcuts import render_to_response
from django.shortcuts import redirect
from django.shortcuts import get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse
from rest_framework.authtoken.models import Token

from .models import Project
from .models import EntityMediaBase
from .notify import Notify

import logging

import sys
import traceback

# Load the main.view logger
logger = logging.getLogger(__name__)

class MainRedirect(View):
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('projects')
        else:
            return redirect('accounts/login')

class ProjectsView(LoginRequiredMixin, TemplateView):
    template_name = 'projects.html'

class CustomView(LoginRequiredMixin, TemplateView):
    template_name = 'new-project/custom.html'

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

class ProjectSettingsView(ProjectBase, TemplateView):
    template_name = 'project-settings.html'

class AnnotationView(ProjectBase, TemplateView):
    template_name = 'annotation.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        media = get_object_or_404(EntityMediaBase, pk=self.kwargs['pk'])
        context['media'] = media
        return context


class AuthMediaView(View):
    def dispatch(self, request, *args, **kwargs):
        """ Identifies permissions for a file in /media
        Returns 200 on OK, returns 403 on Forbidden
        """
        original_url = request.headers['X-Original-URI']
        filename = os.path.basename(original_url)

        # Filename could be a thumbnail, thumbnail_gif, or url
        extension = os.path.splitext(filename)[-1]

        # If it is a JSON avoid a database query and supply segment
        # info file as nothing sensitive is in there
        if extension == 'json':
            return HttpResponse(status=200)

        return HttpResponse(status=200)

class AuthRawView(View):
    def dispatch(self, request, *args, **kwargs):
        """ Identifies permissions for a file in /raw
        Returns 200 on OK, returns 403 on Forbidden
        """
        original_url = request.headers['X-Original-URI']
        filename = os.path.basename(original_url)

        # Filename could be a original

        return HttpResponse(status=200)

def ErrorNotifierView(request, code,message,details=None):

    context = {}
    context['code'] = code
    context['msg'] = message
    context['details'] = details
    response=render_to_response('error-page.html', context)
    response.status_code = code

    # Generate slack message
    if Notify.notification_enabled():
        msg = f"{request.get_host()}:"
        msg += f" ({request.user}/{request.user.id})"
        msg += f" caused {code} at {request.get_full_path()}"
        if details:
            Notify.notify_admin_file(msg, msg + '\n' + details)
        else:
            Notify.notify_admin_msg(msg)

    return response

def NotFoundView(request, exception=None):
    return ErrorNotifierView(request, 404, "Not Found")
def PermissionErrorView(request, exception=None):
    return ErrorNotifierView(request, 403, "Permission Denied")
def ServerErrorView(request, exception=None):
    e_type, value, tb = sys.exc_info()
    error_trace=traceback.format_exception(e_type,value,tb)
    return ErrorNotifierView(request,
                             500,
                             "Server Error",
                             ''.join(error_trace))
