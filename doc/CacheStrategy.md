# Cache Strategy

Use `must-revalidate` for all files 

Max age for folders:
`/static` (javascript etc.) -> 0 seconds
Media Files = 1 hour
Python code = 0 seconds

This means browser uses etag to validate it has the latest copy of something 
after the expiration time. I.e. it trusts media doesn't change for an hour,
but javascript code it will check for it being the latest (via etag) on each
view. This should prevent ctrl-f5 requirements after code updates. 
