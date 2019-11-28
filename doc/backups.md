# Backup and Restore of a database

## Backup Process
The `make backup` command can be used to create a `*.sql` dump of the django
application. This represents all annotations and metadata on media, *but not
the media files themselves*. 

To create the backup use the `make backup` command which will create a SQL
file in the /backup volume of kubernetes. The filename uses the git hash of the
running application to make restoration easier. 

### Cron job

TODO

## Restoration of a database

0.) Create the cluster at the revision of software matching the database git
    hash. This means the software is the same version as when the backup was
    made.
1.) Enter the postgis-bash session. `make postgis-bash`
2.) Create the database `createdb -Udjango tator_online`
3.) Navigate to backup directory `cd /backup`
4.) Use a command to restore the database: 
    `pg_restore --disable-triggers -d tator_online -Udjango file.sql`
5.) Exit the postgis-bash session
6.) Reset gunicorn pods.
7.) Update software to the latest version. 
8.) Run migrations as required. 

