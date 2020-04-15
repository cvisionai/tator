import os

from django.urls import path
from django.urls import include
from django.conf.urls import url

from rest_framework.authtoken import views
from rest_framework.documentation import include_docs_urls
from rest_framework.schemas import get_schema_view
from rest_framework.renderers import DocumentationRenderer

from .views import MainRedirect
from .views import ProjectsView
from .views import CustomView
from .views import ProjectDetailView
from .views import ProjectSettingsView
from .views import AnnotationView
from .views import AuthProjectView
from .views import AuthAdminView

from .rest import *

class CustomDocs(DocumentationRenderer):
    template = '/tator_online/main/templates/browser.html'
    languages = ['javascript']

urlpatterns = [
    path('', MainRedirect.as_view(), name='home'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('projects/', ProjectsView.as_view(), name='projects'),
    path('new-project/custom/', CustomView.as_view(), name='custom'),
    path('<int:project_id>/project-detail', ProjectDetailView.as_view(), name='project-detail'),
    path('<int:project_id>/project-settings', ProjectSettingsView.as_view(), name='project-settings'),
    path('<int:project_id>/annotation/<int:pk>', AnnotationView.as_view(), name='annotation'),
    path('auth-project', AuthProjectView.as_view()),
    path('auth-admin', AuthAdminView.as_view()),
]

# This is used for REST calls
urlpatterns += [
    url(r'^rest/Token', views.obtain_auth_token),
    url(r'^rest/', include_docs_urls(title='Tator REST API', renderer_classes=[CustomDocs])),
    # TODO figure out how to not hard code this.
    url('^schema$', get_schema_view('Tator REST API', url='http://' + os.getenv('MAIN_HOST'))),
    path(
        'rest/Algorithms/<int:project>',
        AlgorithmListAPI.as_view(),
    ),
    path(
        'rest/AlgorithmLaunch/<int:project>',
        AlgorithmLaunchAPI.as_view(),
    ),
    path(
        'rest/Analyses/<int:project>',
        AnalysisAPI.as_view(),
    ),
    path(
        'rest/AttributeTypes/<int:project>',
        AttributeTypeListAPI.as_view(),
        name='AttributeTypes'
    ),
    path(
        'rest/AttributeType/<int:pk>',
        AttributeTypeDetailAPI.as_view(),
        name='AttributeType'
    ),
    path(
        'rest/EntityTypeSchema/<int:pk>',
        EntityTypeSchemaAPI.as_view(),
        name='EntityTypeSchema'
    ),
    path(
        'rest/FrameAssociation/<int:pk>',
        FrameAssociationDetailAPI.as_view(),
    ),
    path(
        'rest/Job/<str:run_uid>',
        JobDetailAPI.as_view(),
    ),
    path(
        'rest/JobGroup/<str:group_id>',
        JobGroupDetailAPI.as_view(),
    ),
    path(
        'rest/LocalizationAssociation/<int:pk>',
        LocalizationAssociationDetailAPI.as_view(),
    ),
    path(
        'rest/Localizations/<int:project>',
        LocalizationListAPI.as_view(),
        name='Localizations'
    ),
    path(
        'rest/Localization/<int:pk>',
        LocalizationDetailAPI.as_view(),
    ),
    path(
        'rest/LocalizationTypes/<int:project>',
        LocalizationTypeListAPI.as_view(),
    ),
    path(
        'rest/LocalizationType/<int:pk>',
        LocalizationTypeDetailAPI.as_view(),
    ),
    path(
        'rest/Medias/<int:project>',
        MediaListAPI.as_view(),
        name='Medias'
    ),
    path(
        'rest/Media/<int:pk>',
        MediaDetailAPI.as_view(),
        name='Media'
    ),
    path(
        'rest/MediaNext/<int:pk>',
        MediaNextAPI.as_view(),
        name='MediaNext',
    ),
    path(
        'rest/MediaPrev/<int:pk>',
        MediaPrevAPI.as_view(),
        name='MediaPrev',
    ),
    path(
        'rest/MediaSections/<int:project>',
        MediaSectionsAPI.as_view(),
        name='MediaSections',
    ),
    path(
        'rest/MediaTypes/<int:project>',
        MediaTypeListAPI.as_view(),
    ),
    path(
        'rest/MediaType/<int:pk>',
        MediaTypeDetailAPI.as_view(),
    ),
    path(
        'rest/Memberships/<int:project>',
        MembershipListAPI.as_view(),
    ),
    path(
        'rest/Membership/<int:pk>',
        MembershipDetailAPI.as_view(),
    ),
    path(
        'rest/Notify',
        NotifyAPI.as_view(),
    ),
    path(
        'rest/Progress/<int:project>',
        ProgressAPI.as_view(),
    ),
    path(
        'rest/Projects',
        ProjectListAPI.as_view(),
    ),
    path(
        'rest/Project/<int:pk>',
        ProjectDetailAPI.as_view(),
    ),
    path(
        'rest/SaveImage/<int:project>',
        SaveImageAPI.as_view(),
        name='SaveImage',
    ),
    path(
        'rest/SaveVideo/<int:project>',
        SaveVideoAPI.as_view(),
        name='SaveVideo',
    ),
    path(
        'rest/SectionAnalysis/<int:project>',
        SectionAnalysisAPI.as_view(),
        name='SectionAnalysis',
    ),
    path(
        'rest/States/<int:project>',
        StateListAPI.as_view(),
        name='States'
    ),
    path(
        'rest/State/<int:pk>',
        StateDetailAPI.as_view(),
    ),
    path(
        'rest/StateTypes/<int:project>',
        StateTypeListAPI.as_view(),
    ),
    path(
        'rest/StateType/<int:pk>',
        StateTypeDetailAPI.as_view(),
    ),
    path(
        'rest/Transcode/<int:project>',
        TranscodeAPI.as_view(),
    ),
    path(
        'rest/TreeLeafTypes/<int:project>',
        TreeLeafTypeListAPI.as_view(),
    ),
    path(
        'rest/TreeLeafType/<int:pk>',
        TreeLeafTypeDetailAPI.as_view(),
    ),
    path(
        'rest/TreeLeaves/Suggestion/<str:ancestor>/<int:project>',
        TreeLeafSuggestionAPI.as_view(),
    ),
    path(
        'rest/TreeLeaves/<int:project>',
        TreeLeafListAPI.as_view(),
        name='TreeLeaves',
    ),
    path(
        'rest/TreeLeaf/<int:pk>',
        TreeLeafDetailAPI.as_view(),
    ),
    path(
        'rest/User/<int:pk>',
        UserDetailAPI.as_view(),
    ),
    path(
        'rest/User/GetCurrent',
        CurrentUserAPI.as_view(),
    ),
    path(
        'rest/Versions/<int:project>',
        VersionListAPI.as_view(),
        name='Versions',
    ),
    path(
        'rest/Version/<int:pk>',
        VersionDetailAPI.as_view(),
        name='Version',
    ),
    path('rest/GetFrame/<int:pk>',
         GetFrameAPI.as_view(),
    ),
    # To be deprecated
    path(
        'rest/EntityTypeMedias/<int:project>',
        MediaTypeListAPI.as_view(),
    ),
    path(
        'rest/EntityTypeMedia/<int:pk>',
        MediaTypeDetailAPI.as_view(),
    ),
    path(
        'rest/EntityMedia/<int:pk>',
        MediaDetailAPI.as_view(),
        name='EntityMedia'
    ),
    path(
        'rest/EntityMedias/<int:project>',
        MediaListAPI.as_view(),
        name='EntityMedias'
    ),
    path(
        'rest/EntityStates/<int:project>',
        StateListAPI.as_view(),
        name='EntityStates'
    ),
    path(
        'rest/EntityState/<int:pk>',
        StateDetailAPI.as_view(),
    ),
    path(
        'rest/EntityStateTypes/<int:project>',
        StateTypeListAPI.as_view(),
    ),
    path(
        'rest/EntityStateType/<int:pk>',
        StateTypeDetailAPI.as_view(),
    ),
]
