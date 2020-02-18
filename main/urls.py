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

from .rest import LocalizationList;
from .rest import LocalizationTypeListAPI;
from .rest import LocalizationDetailAPI;
from .rest import EntityMediaDetailAPI
from .rest import EntityMediaListAPI
from .rest import EntityTypeMediaListAPI
from .rest import EntityTypeMediaDetailAPI
from .rest import EntityTypeSchemaAPI
from .rest import EntityStateCreateListAPI;
from .rest import EntityStateDetailAPI;
from .rest import EntityStateTypeListAPI;
from .rest import SuggestionAPI;
from .rest import TreeLeafListAPI;
from .rest import TreeLeafDetailAPI;
from .rest import TreeLeafTypeListAPI;
from .rest import LocalizationAssociationDetailAPI;
from .rest import FrameAssociationDetailAPI
from .rest import ProgressAPI;
from .rest import TranscodeAPI;
from .rest import AlgorithmListAPI;
from .rest import AlgorithmLaunchAPI;
from .rest import JobDetailAPI
from .rest import JobGroupDetailAPI
from .rest import MembershipListAPI;
from .rest import ProjectListAPI
from .rest import ProjectDetailAPI
from .rest import AnalysisAPI
from .rest import NotifyAPI
from .rest import UserDetailAPI
from .rest import MediaPrevAPI
from .rest import MediaNextAPI
from .rest import MediaSectionsAPI
from .rest import SectionAnalysisAPI
from .rest import SaveVideoAPI
from .rest import SaveImageAPI
from .rest import VersionListAPI
from .rest import VersionDetailAPI

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
        'rest/Localizations/<int:project>',
        LocalizationList.as_view(),
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
        'rest/EntityTypeMedias/<int:project>',
        EntityTypeMediaListAPI.as_view(),
    ),
    path(
        'rest/EntityTypeMedia/<int:pk>',
        EntityTypeMediaDetailAPI.as_view(),
    ),
    path(
        'rest/EntityTypeSchema/<int:pk>',
        EntityTypeSchemaAPI.as_view(),
        name='EntityTypeSchema'
    ),
    path(
        'rest/EntityMedia/<int:pk>',
        EntityMediaDetailAPI.as_view(),
        name='EntityMedia'
    ),
    path(
        'rest/EntityMedias/<int:project>',
        EntityMediaListAPI.as_view(),
        name='EntityMedias'
    ),
    path(
        'rest/EntityStates/<int:project>',
        EntityStateCreateListAPI.as_view(),
        name='EntityStates'
    ),
    path(
        'rest/EntityState/<int:pk>',
        EntityStateDetailAPI.as_view(),
    ),
    path(
        'rest/EntityStateTypes/<int:project>',
        EntityStateTypeListAPI.as_view(),
    ),
    path(
        'rest/TreeLeafTypes/<int:project>',
        TreeLeafTypeListAPI.as_view(),
    ),
    path(
        'rest/TreeLeaves/Suggestion/<str:ancestor>/<int:project>',
        SuggestionAPI.as_view(),
    ),
    path(
        'rest/TreeLeaves/<int:project>',
        TreeLeafListAPI.as_view(),
    ),
    path(
        'rest/TreeLeaf/<int:pk>',
        TreeLeafDetailAPI.as_view(),
    ),
    path(
        'rest/LocalizationAssociation/<int:pk>',
        LocalizationAssociationDetailAPI.as_view(),
    ),
    path(
        'rest/FrameAssociation/<int:pk>',
        FrameAssociationDetailAPI.as_view(),
    ),
    path(
        'rest/Progress/<int:project>',
        ProgressAPI.as_view(),
    ),
    path(
        'rest/Transcode/<int:project>',
        TranscodeAPI.as_view(),
    ),
    path(
        'rest/Algorithms/<int:project>',
        AlgorithmListAPI.as_view(),
    ),
    path(
        'rest/AlgorithmLaunch/<int:project>',
        AlgorithmLaunchAPI.as_view(),
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
        'rest/Memberships/<int:project>',
        MembershipListAPI.as_view(),
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
        'rest/Analyses/<int:project>',
        AnalysisAPI.as_view(),
    ),
     path(
        'rest/Notify',
        NotifyAPI.as_view(),
    ),
    path(
        'rest/User/<int:pk>',
        UserDetailAPI.as_view(),
    ),
    path(
        'rest/MediaPrev/<int:pk>',
        MediaPrevAPI.as_view(),
        name='MediaPrev',
    ),
    path(
        'rest/MediaNext/<int:pk>',
        MediaNextAPI.as_view(),
        name='MediaNext',
    ),
    path(
        'rest/MediaSections/<int:project>',
        MediaSectionsAPI.as_view(),
        name='MediaSections',
    ),
    path(
        'rest/SectionAnalysis/<int:project>',
        SectionAnalysisAPI.as_view(),
        name='SectionAnalysis',
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
        'rest/Versions/<int:project>',
        VersionListAPI.as_view(),
        name='Versions',
    ),
    path(
        'rest/Version/<int:pk>',
        VersionDetailAPI.as_view(),
        name='Version',
    ),
]
