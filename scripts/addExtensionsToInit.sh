if [ `cat /tator_online/main/migrations/0001_initial.py | grep "CREATE EXTENSION ltree" | wc -l` -eq 0 ]; then
  add_on="operations = \[ migrations.RunSQL('CREATE EXTENSION ltree','DROP EXTENSION ltree'),migrations.RunSQL('CREATE EXTENSION IF NOT EXISTS postgis','DROP EXTENSION postgis'),migrations.RunSQL('CREATE EXTENSION IF NOT EXISTS pg_trgm','DROP EXTENSION pg_trgm'),migrations.RunSQL('CREATE EXTENSION IF NOT EXISTS vector','DROP EXTENSION vector'),"
  sed "s:operations = \[:${add_on}:g" -i /tator_online/main/migrations/0001_initial.py
fi