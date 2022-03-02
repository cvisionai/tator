from main.store import get_tator_store


class TatorBackupManager:
    def __init__(self, project):
        # Get the `TatorStore` object that connects to live object storage
        self._live_store = get_tator_store(project.get_bucket())

        # Get the `TatorStore` object that connects to backup object storage
        backup_bucket = project.get_bucket(backup=True)
        self._backup_store = get_tator_store(bucket=backup_bucket, backup=(backup_bucket is None))

    def backup_path(self, path: str) -> bool:
        """
        Copies the given resource from the `_live_store` to the `_backup_store`. Returns True if the
        operation was successful or if the object was already backed up, otherwise False

        :param path: The key of the object to back up
        :type path: str
        :rtype: bool
        """
        logger.info(f"Backing up object {path} not implemented yet")
        return False
