import os

from django.urls import path
from django.urls import include
from django.conf.urls import url

from rest_framework.authtoken import views
from rest_framework.documentation import include_docs_urls
from rest_framework.schemas import get_schema_view

from .views import MainRedirect
from .views import ProjectsView
from .views import CustomView
from .views import ProjectDetailView
from .views import ProjectSettingsView
from .views import AnnotationView

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
from .rest import UploadProgressAPI;
from .rest import TranscodeAPI;
from .rest import PackageListAPI;
from .rest import PackageDetailAPI;
from .rest import PackageCreateAPI;
from .rest import AlgorithmListAPI;
from .rest import AlgorithmLaunchAPI;
from .rest import AlgorithmResultListAPI;
from .rest import JobDetailAPI
from .rest import JobGroupDetailAPI
from .rest import MembershipListAPI;
from .rest import ProjectListAPI
from .rest import ProjectDetailAPI
from .rest import AnalysisAPI
from .rest import NotifyAPI

urlpatterns = [
    path('', MainRedirect.as_view(), name='home'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('projects/', ProjectsView.as_view(), name='projects'),
    path('new-project/custom/', CustomView.as_view(), name='custom'),
    path('<int:project_id>/project-detail', ProjectDetailView.as_view(), name='project-detail'),
    path('<int:project_id>/project-settings', ProjectSettingsView.as_view(), name='project-settings'),
    path('<int:project_id>/annotation/<int:pk>', AnnotationView.as_view(), name='annotation'),
]

# This is used for REST calls
urlpatterns += [
    url(r'^rest/Token', views.obtain_auth_token),
    url(r'^rest/', include_docs_urls(title='Tator REST API')),
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
        'rest/UploadProgress/<int:project>',
        UploadProgressAPI.as_view(),
    ),
    path(
        'rest/Transcode/<int:project>',
        TranscodeAPI.as_view(),
    ),
    path(
        'rest/Packages/<int:project>',
        PackageListAPI.as_view(),
    ),
    path(
        'rest/Package/<int:pk>',
        PackageDetailAPI.as_view(),
    ),
    path(
        'rest/PackageCreate/<int:project>',
        PackageCreateAPI.as_view(),
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
        'rest/AlgorithmResults/<int:project>',
        AlgorithmResultListAPI.as_view(),
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
]
