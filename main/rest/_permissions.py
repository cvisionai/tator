from rest_framework.permissions import BasePermission
from django.contrib.auth.models import AnonymousUser

from ..models import Permission
from ..models import Algorithm
from ..models import EntityState
from ..kube import TatorTranscode

class ProjectPermissionBase(BasePermission):
    """Base class for requiring project permissions.
    """
    def has_permission(self, request, view):
        # Get the project from the URL parameters
        if 'project' in view.kwargs:
            project_id = view.kwargs['project']
            project = get_object_or_404(Project, pk=int(project_id))
        elif 'pk' in view.kwargs:
            pk = view.kwargs['pk']
            obj = get_object_or_404(view.get_queryset(), pk=pk)
            project = self._project_from_object(obj)
        elif 'run_uid' in view.kwargs:
            uid = view.kwargs['run_uid']
            project = TatorTranscode().find_project(f"uid={uid}")
            if not project:
                qs = Job.objects.filter(run_uid=uid)
                if not qs.exists():
                    raise Http404
                project = self._project_from_object(qs[0])
            if not project:
                for alg in Algorithm.objects.all():
                    project = TatorAlgorithm(alg).find_project(f"uid={uid}")
        elif 'group_id' in view.kwargs:
            uid = view.kwargs['group_id']
            project = TatorTranscode().find_project(f"gid={uid}")
            if not project:
                qs = Job.objects.filter(group_id=uid)
                if not qs.exists():
                    raise Http404
                project = self._project_from_object(qs[0])
            if not project:
                for alg in Algorithm.objects.all():
                    project = TatorAlgorithm(alg).find_project(f"gid={uid}")
        return self._validate_project(request, project)

    def has_object_permission(self, request, view, obj):
        # Get the project from the object
        project = self._project_from_object(obj)
        return self._validate_project(request, project)

    def _project_from_object(self, obj):
        project=None
        if hasattr(obj, 'project'):
            project = obj.project
        # Object is a project
        elif isinstance(obj, Project):
            project = obj
        elif isinstance(obj, FrameAssociation) or isinstance(obj, LocalizationAssociation):
            project = None
            try:
                parent = EntityState.objects.get(association=obj)
                project = parent.project
            except:
                pass
        return project

    def _validate_project(self, request, project):
        granted = True

        if isinstance(request.user, AnonymousUser):
            granted = False
        else:
            # Find membership for this user and project
            membership = Membership.objects.filter(
                user=request.user,
                project=project
            )

            # If user is not part of project, deny access
            if membership.count() == 0:
                granted = False
            else:
                # If user has insufficient permission, deny access
                permission = membership[0].permission
                insufficient = permission in self.insufficient_permissions
                is_edit = request.method not in SAFE_METHODS
                if is_edit and insufficient:
                    granted = False
        return granted

class ProjectViewOnlyPermission(ProjectPermissionBase):
    """Checks whether a user has view only access to a project. This
       is just to check whether a user is a member of a project.
    """
    message = "Not a member of this project."
    insufficient_permissions = []

class ProjectEditPermission(ProjectPermissionBase):
    """Checks whether a user has edit access to a project.
    """
    message = "Insufficient permission to modify this project."
    insufficient_permissions = [Permission.VIEW_ONLY]

class ProjectTransferPermission(ProjectPermissionBase):
    """Checks whether a user has transfer access to a project.
    """
    message = "Insufficient permission to transfer media within this project."
    insufficient_permissions = [Permission.VIEW_ONLY, Permission.CAN_EDIT]

class ProjectExecutePermission(ProjectPermissionBase):
    """Checks whether a user has execute access to a project.
    """
    message = "Insufficient permission to execute within this project."
    insufficient_permissions = [
        Permission.VIEW_ONLY,
        Permission.CAN_EDIT,
        Permission.CAN_TRANSFER,
    ]

class ProjectFullControlPermission(ProjectPermissionBase):
    """Checks if user has full control over a project.
    """
    message = "Insufficient permission to edit project settings."
    insufficient_permissions = [
        Permission.VIEW_ONLY,
        Permission.CAN_EDIT,
        Permission.CAN_TRANSFER,
        Permission.CAN_EXECUTE,
    ]

class ProjectOwnerPermission(BasePermission):
    """Checks if a user owns a project.
    """
    message = "Only project owners may delete a project."

    def has_object_permission(self, request, view, obj):
        granted = True
        is_delete = request.method == 'DELETE'
        is_owner = request.user == obj.creator
        if is_delete and not is_owner:
            granted = False
        return granted

class UserPermission(BasePermission):
    """ 1.) Reject all anonymous requests
        2.) Allow all super-user requests
        3.) Allow any cousin requests (users on a common project) (read-only)
        4.) Allow any request if user id = pk
    """
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False

        user = request.user
        finger_user = view.kwargs['pk']
        if user.is_staff:
            return True
        if user.id == finger_user:
            return True

        # find out if user is a cousin
        user_projects=Membership.objects.filter(user=user).values('project')
        cousins=Membership.objects.filter(project__in = user_projects).values('user').distinct()
        is_cousin = cousins.filter(user=finger_user).count() > 0
        if is_cousin and request.method == 'GET':
            # Cousins have read-only permission
            return True

        return False

