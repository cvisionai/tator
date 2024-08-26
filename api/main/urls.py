import os
import logging

from django.urls import path, re_path
from django.urls import include
from django.conf import settings
from django.contrib.auth.views import LogoutView
from django.contrib.auth.views import LoginView

from rest_framework.schemas import get_schema_view

import django_saml2_auth.views

from .views import (
    AuthAdminView,
    AuthProjectView,
    check_login,
    LoginRedirect,
    StreamSaverMITMLocal,
    StreamSaverSWLocal,
)

from .schema import NoAliasRenderer
from .schema import CustomGenerator

from .rest import *

logger = logging.getLogger(__name__)

schema_view = get_schema_view(
    title="Tator REST API",
    version="DEVELOPMENT_VERSION",
    generator_class=CustomGenerator,
    renderer_classes=[NoAliasRenderer],
    public=True,
)

urlpatterns = [
    path("stream-saver/sw.js", StreamSaverSWLocal.as_view(), name="sw"),
    path("stream-saver/mitm.html", StreamSaverMITMLocal.as_view(), name="mitm"),
    path("auth-project", AuthProjectView.as_view()),
    path("auth-admin", AuthAdminView.as_view()),
    path("check-login/", check_login),
    path("accounts/logout/", LogoutView.as_view()),
    path("redirect/login/", LoginRedirect.as_view()),
    path(
        "accounts/login/",
        LoginView.as_view(
            extra_context={
                "email_enabled": settings.TATOR_EMAIL_ENABLED,
                "okta_enabled": settings.OKTA_ENABLED,
                "anonymous_gateway_enabled": settings.ANONYMOUS_GATEWAY_ENABLED,
            }
        ),
        name="login",
    ),
]

if settings.ANONYMOUS_GATEWAY_ENABLED:
    urlpatterns.append(
        path("anonymous-gateway", AnonymousGatewayAPI.as_view(), name="anonymous-gateway")
    )

if settings.COGNITO_ENABLED or settings.OKTA_ENABLED:
    urlpatterns.append(path("jwt-gateway/", JwtGatewayAPI.as_view(), name="jwt-gateway"))
    if settings.OKTA_ENABLED:
        urlpatterns.append(path("oauth2/login/", Oauth2LoginAPI.as_view(), name="oauth2"))

if settings.SAML_ENABLED:
    urlpatterns.append(re_path(r"^saml2_auth/", include("django_saml2_auth.urls")))

# This is used for REST calls
urlpatterns += [
    path("schema/", schema_view, name="schema"),
    path(
        "rest/Affiliations/<int:organization>",
        AffiliationListAPI.as_view(),
    ),
    path(
        "rest/Affiliation/<int:id>",
        AffiliationDetailAPI.as_view(),
    ),
    path(
        "rest/Algorithms/<int:project>",
        AlgorithmListAPI.as_view(),
    ),
    path(
        "rest/Algorithm/<int:id>",
        AlgorithmDetailAPI.as_view(),
    ),
    path(
        "rest/SaveAlgorithmManifest/<int:project>",
        SaveAlgorithmManifestAPI.as_view(),
        name="SaveAlgorithmManifest",
    ),
    path(
        "rest/Announcements",
        AnnouncementListAPI.as_view(),
    ),
    path(
        "rest/Announcement/<int:id>",
        AnnouncementDetailAPI.as_view(),
    ),
    path(
        "rest/AttributeType/<int:id>",
        AttributeTypeListAPI.as_view(),
    ),
    path(
        "rest/AudioFiles/<int:id>",
        AudioFileListAPI.as_view(),
    ),
    path(
        "rest/AudioFile/<int:id>",
        AudioFileDetailAPI.as_view(),
    ),
    path(
        "rest/AuxiliaryFiles/<int:id>",
        AuxiliaryFileListAPI.as_view(),
    ),
    path(
        "rest/AuxiliaryFile/<int:id>",
        AuxiliaryFileDetailAPI.as_view(),
    ),
    path(
        "rest/Bookmarks/<int:project>",
        BookmarkListAPI.as_view(),
    ),
    path(
        "rest/Bookmark/<int:id>",
        BookmarkDetailAPI.as_view(),
    ),
    path(
        "rest/Buckets/<int:organization>",
        BucketListAPI.as_view(),
    ),
    path(
        "rest/Bucket/<int:id>",
        BucketDetailAPI.as_view(),
    ),
    path(
        "rest/ChangeLog/<int:project>",
        ChangeLogListAPI.as_view(),
    ),
    path(
        "rest/CloneMedia/<int:project>",
        CloneMediaListAPI.as_view(),
    ),
    path(
        "rest/GetClonedMedia/<int:id>",
        GetClonedMediaAPI.as_view(),
    ),
    path(
        "rest/Applets/<int:project>",
        AppletListAPI.as_view(),
    ),
    path(
        "rest/Applet/<int:id>",
        AppletDetailAPI.as_view(),
    ),
    path(
        "rest/DownloadInfo/<int:project>",
        DownloadInfoAPI.as_view(),
    ),
    path(
        "rest/Email/<int:project>",
        EmailAPI.as_view(),
    ),
    path(
        "rest/Favorites/<int:project>",
        FavoriteListAPI.as_view(),
    ),
    path(
        "rest/Favorite/<int:id>",
        FavoriteDetailAPI.as_view(),
    ),
    path(
        "rest/Files/<int:project>",
        FileListAPI.as_view(),
    ),
    path(
        "rest/File/<int:id>",
        FileDetailAPI.as_view(),
    ),
    path(
        "rest/FileTypes/<int:project>",
        FileTypeListAPI.as_view(),
    ),
    path(
        "rest/FileType/<int:id>",
        FileTypeDetailAPI.as_view(),
    ),
    path(
        "rest/GetFrame/<int:id>",
        GetFrameAPI.as_view(),
    ),
    path(
        "rest/GetClip/<int:id>",
        GetClipAPI.as_view(),
    ),
    path("rest/Group/<int:id>", GroupDetailAPI.as_view()),
    path("rest/Groups/<int:organization>", GroupListAPI.as_view()),
    path(
        "rest/HostedTemplates/<int:organization>",
        HostedTemplateListAPI.as_view(),
    ),
    path(
        "rest/HostedTemplate/<int:id>",
        HostedTemplateDetailAPI.as_view(),
    ),
    path(
        "rest/ImageFiles/<int:id>",
        ImageFileListAPI.as_view(),
    ),
    path(
        "rest/ImageFile/<int:id>",
        ImageFileDetailAPI.as_view(),
    ),
    path(
        "rest/Invitations/<int:organization>",
        InvitationListAPI.as_view(),
    ),
    path(
        "rest/Invitation/<int:id>",
        InvitationDetailAPI.as_view(),
    ),
    path(
        "rest/Jobs/<int:project>",
        JobListAPI.as_view(),
    ),
    path(
        "rest/Job/<str:uid>",
        JobDetailAPI.as_view(),
    ),
    path(
        "rest/JobClusters/<int:organization>",
        JobClusterListAPI.as_view(),
    ),
    path(
        "rest/JobCluster/<int:id>",
        JobClusterDetailAPI.as_view(),
    ),
    path(
        "rest/Leaves/Suggestion/<str:ancestor>/<int:project>",
        LeafSuggestionAPI.as_view(),
    ),
    path(
        "rest/Leaves/<int:project>",
        LeafListAPI.as_view(),
        name="Leaves",
    ),
    path(
        "rest/Leaf/<int:id>",
        LeafDetailAPI.as_view(),
    ),
    path(
        "rest/LeafCount/<int:project>",
        LeafCountAPI.as_view(),
    ),
    path(
        "rest/LeafTypes/<int:project>",
        LeafTypeListAPI.as_view(),
    ),
    path(
        "rest/LeafType/<int:id>",
        LeafTypeDetailAPI.as_view(),
    ),
    path("rest/Localizations/<int:project>", LocalizationListAPI.as_view(), name="Localizations"),
    path(
        "rest/Localization/<int:id>",
        LocalizationDetailAPI.as_view(),
    ),
    path(
        "rest/Localization/<int:version>/<str:elemental_id>",
        LocalizationDetailByElementalIdAPI.as_view(),
    ),
    path(
        "rest/LocalizationCount/<int:project>",
        LocalizationCountAPI.as_view(),
    ),
    path(
        "rest/LocalizationTypes/<int:project>",
        LocalizationTypeListAPI.as_view(),
    ),
    path(
        "rest/LocalizationType/<int:id>",
        LocalizationTypeDetailAPI.as_view(),
    ),
    path(
        "rest/LocalizationGraphic/<int:id>",
        LocalizationGraphicAPI.as_view(),
        name="LocalizationGraphic",
    ),
    path("rest/Medias/<int:project>", MediaListAPI.as_view(), name="Medias"),
    path("rest/Media/<int:id>", MediaDetailAPI.as_view(), name="Media"),
    path("rest/MediaCount/<int:project>", MediaCountAPI.as_view(), name="MediaCount"),
    path(
        "rest/MediaNext/<int:id>",
        MediaNextAPI.as_view(),
        name="MediaNext",
    ),
    path(
        "rest/MediaPrev/<int:id>",
        MediaPrevAPI.as_view(),
        name="MediaPrev",
    ),
    path(
        "rest/MediaStats/<int:project>",
        MediaStatsAPI.as_view(),
    ),
    path(
        "rest/MediaTypes/<int:project>",
        MediaTypeListAPI.as_view(),
    ),
    path(
        "rest/MediaType/<int:id>",
        MediaTypeDetailAPI.as_view(),
    ),
    path(
        "rest/Memberships/<int:project>",
        MembershipListAPI.as_view(),
        name="Memberships",
    ),
    path(
        "rest/Membership/<int:id>",
        MembershipDetailAPI.as_view(),
        name="Membership",
    ),
    path(
        "rest/Notify",
        NotifyAPI.as_view(),
    ),
    path(
        "rest/Organizations",
        OrganizationListAPI.as_view(),
    ),
    path(
        "rest/Organization/<int:id>",
        OrganizationDetailAPI.as_view(),
    ),
    path(
        "rest/OrganizationUploadInfo/<int:organization>",
        OrganizationUploadInfoAPI.as_view(),
    ),
    path(
        "rest/PasswordReset",
        PasswordResetListAPI.as_view(),
    ),
    path("rest/Permalink/<int:id>", PermalinkAPI.as_view(), name="Permalink"),
    path(
        "rest/Projects",
        ProjectListAPI.as_view(),
    ),
    path(
        "rest/Project/<int:id>",
        ProjectDetailAPI.as_view(),
    ),
    path(
        "rest/RowProtections",
        RowProtectionListAPI.as_view(),
    ),
    path(
        "rest/RowProtection/<int:id>",
        RowProtectionDetailAPI.as_view(),
    ),
    path(
        "rest/SaveGenericFile/<int:project>",
        SaveGenericFileAPI.as_view(),
        name="SaveGenericFile",
    ),
    path(
        "rest/Sections/<int:project>",
        SectionListAPI.as_view(),
    ),
    path(
        "rest/Section/<int:id>",
        SectionDetailAPI.as_view(),
    ),
    path("rest/States/<int:project>", StateListAPI.as_view(), name="States"),
    path(
        "rest/StateCount/<int:project>",
        StateCountAPI.as_view(),
        name="StateCount",
    ),
    path("rest/StateGraphic/<int:id>", StateGraphicAPI.as_view(), name="StateGraphic"),
    path(
        "rest/State/<int:id>",
        StateDetailAPI.as_view(),
    ),
    path(
        "rest/State/<int:version>/<str:elemental_id>",
        StateDetailByElementalIdAPI.as_view(),
    ),
    path(
        "rest/MergeStates/<int:id>",
        MergeStatesAPI.as_view(),
    ),
    path(
        "rest/TrimStateEnd/<int:id>",
        TrimStateEndAPI.as_view(),
    ),
    path(
        "rest/StateTypes/<int:project>",
        StateTypeListAPI.as_view(),
    ),
    path(
        "rest/StateType/<int:id>",
        StateTypeDetailAPI.as_view(),
    ),
    path(
        "rest/TemporaryFiles/<int:project>",
        TemporaryFileListAPI.as_view(),
    ),
    path(
        "rest/TemporaryFile/<int:id>",
        TemporaryFileDetailAPI.as_view(),
    ),
    path(
        "rest/Token",
        TokenAPI.as_view(),
    ),
    path(
        "rest/Transcodes/<int:project>",
        TranscodeListAPI.as_view(),
    ),
    path(
        "rest/Transcode/<str:uid>",
        TranscodeDetailAPI.as_view(),
    ),
    path(
        "rest/UploadCompletion/<int:project>",
        UploadCompletionAPI.as_view(),
    ),
    path(
        "rest/UploadInfo/<int:project>",
        UploadInfoAPI.as_view(),
    ),
    path(
        "rest/Users",
        UserListAPI.as_view(),
    ),
    path(
        "rest/User/Exists",
        UserExistsAPI.as_view(),
    ),
    path(
        "rest/User/GetCurrent",
        CurrentUserAPI.as_view(),
    ),
    path(
        "rest/User/<int:id>",
        UserDetailAPI.as_view(),
    ),
    path(
        "rest/Versions/<int:project>",
        VersionListAPI.as_view(),
        name="Versions",
    ),
    path(
        "rest/Version/<int:id>",
        VersionDetailAPI.as_view(),
        name="Version",
    ),
    path(
        "rest/VideoFiles/<int:id>",
        VideoFileListAPI.as_view(),
    ),
    path(
        "rest/VideoFile/<int:id>",
        VideoFileDetailAPI.as_view(),
    ),
]
