from django.views import View
from django.views.generic.base import TemplateView
from django.shortcuts import render_to_response
from django.shortcuts import redirect
from django.shortcuts import get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from rest_framework.authtoken.models import Token

from .models import Project
from .models import EntityMediaBase

from django.conf import settings

import logging

import slack

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



def ErrorNotifierView(request, code,message,details=None):

    context = {}
    context['code'] = code
    context['msg'] = message
    context['details'] = details
    response=render_to_response('error-page.html', context)
    response.status_code = code

    # Generate slack message
    if settings.TATOR_SLACK_TOKEN and settings.TATOR_SLACK_CHANNEL:
        msg=f"{request.get_host()}:"
        msg += f" ({request.user}/{request.user.id})"
        msg += f" caused {code} at {request.get_full_path()}"
        client = slack.WebClient(token=settings.TATOR_SLACK_TOKEN)
        client.chat_postMessage(channel=settings.TATOR_SLACK_CHANNEL,
                                text=msg)

    return response

def NotFoundView(request, exception=None):
    return ErrorNotifierView(request, 404, "Not Found")
def PermissionErrorView(request, exception=None):
    return ErrorNotifierView(request, 403, "Permission Denied")
def ServerErrorView(request, exception=None):
    return ErrorNotifierView(request, 500, "Server Error")
