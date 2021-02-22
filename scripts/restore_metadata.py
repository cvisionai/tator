#!/usr/bin/env python3

"""
This script can be used to recovery data from a tator online database backup

It is suggested to run this script in a postgis container with the latest
tator-py installed.

Usage:
1.) Acquire *.sql backup file
2.) Standup postgis container, run SQL
    docker run --name restore -e POSTGRES_PASSWORD=temp --rm -ti -v `pwd`:/work postgis/postgis

3.) Login to pod with another shell and install latest tator-py and prepare to run this script

4.) Restore the old db to the temporary postgis
root@86eab2245b85:/work# createdb -U postgres tator_online
root@86eab2245b85:/work# pg_restore -U postgres -d tator_online --disable-triggers -v backup.sql

5.) Call this script to isolate the media and identify restorable metadata: e.g.)
python3 restore_metadata --project 4 --keyname Trip --keyvalue TripId

6.) If count looks correct, re-run with a valid `--token` argument.

"""
import argparse
import tator
import psycopg2
import psycopg2.extras

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db-name", default="tator_online")
    parser.add_argument("--token", help="Supply if updting, else dry run")
    parser.add_argument("--project", required=True,
                        type=int,help="Project to scan")
    parser.add_argument("--keyname", required=True, type="str",
                        help="key value to isolate effected media (attribute key)")
    parser.add_argument("--keyvalue", required=True, type="str",
                        help="key value to isolate effected media (attribute key)")
    args = parser.parse_args()
    conn = psycopg2.connect(f"dbname={args.db_name} user=postgres")
    media_ids=[]
    with conn.cursor() as cur:
        cur.execute(f"SELECT id,attributes from main_media WHERE project = {args.project}")
        media = cur.fetchone()
        print(media)
        while media is not None:
            attributes = media[1]
            if attributes.get(args.keyname,None) == args.value:
                media_ids.append(media[0])
            media = cur.fetchone()

    print(f"Found media = {len(media_ids)}")

    localization_objs=[]
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        media_ids_str=','.join([str(x) for x in media_ids])
        cols=['frame','x','y','width','attributes','media','meta','project']
        col_str=','.join(cols)
        cur.execute(f"SELECT {col_str} FROM main_localization WHERE media in ({media_ids_str})")
        localization = cur.fetchone()
        while localization is not None:
            obj = {}
            for col in cols:
                if col == 'meta':
                    obj['type'] = localization[col]
                elif col == 'media':
                    obj['media_id'] = localization[col]
                elif col == 'attributes':
                    obj.update(localization[col])
                else:
                    obj[col] = localization[col]
            localization_objs.append(obj)
            localization = cur.fetchone()

    print(f"Localizations = {len(localization_objs)}")
    state_objs=[]
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
        media_ids_str=','.join([str(x) for x in media_ids])
        cur.execute(f"SELECT DISTINCT state_id FROM main_state_media where media_id IN ({media_ids_str})")
        state_ids = cur.fetchall()
        state_ids_str=','.join([str(x[0]) for x in state_ids])
        cur.execute(f"SELECT id,frame,meta,attributes FROM main_state where id IN ({state_ids_str})")
        state = cur.fetchone()
        while state != None:
            obj={}
            obj['frame'] = state['frame']
            obj['type'] = state['meta']
            obj.update(state['attributes'])
            with conn.cursor() as cur2:
                cur2.execute(f"SELECT media_id FROM main_state_media where state_ID = {state[0]}")
                obj['media_ids'] = [x[0] for x in cur2.fetchall()]
            state_objs.append(obj)
            state = cur.fetchone()
    print(f"States = {len(state_objs)}")

    if args.token and args.project:
        api = tator.get_api(token=args.token)
        created_ids = []
        for response in tator.util.chunked_create(api.create_localization_list,
                                                  args.project,localization_spec=localization_objs):
            created_ids += response.id

        print(f"Created: {len(created_ids)}")

        for response in tator.util.chunked_create(api.create_state_list,
                                                  args.project,state_spec=state_objs):
            created_ids += response.id

        print(f"Created: {len(created_ids)}")


if __name__=="__main__":
    main()
