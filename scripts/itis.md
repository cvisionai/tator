#Schema for SQLite ITIS db

```
sqlite> PRAGMA table_info(taxonomic_units)
   ...> ;
Taxonomic units:
0|tsn|int(11)|1||1
1|unit_ind1|char(1)|0|NULL|0
2|unit_name1|char(35)|1||0
3|unit_ind2|char(1)|0|NULL|0
4|unit_name2|varchar(35)|0|NULL|0
5|unit_ind3|varchar(7)|0|NULL|0
6|unit_name3|varchar(35)|0|NULL|0
7|unit_ind4|varchar(7)|0|NULL|0
8|unit_name4|varchar(35)|0|NULL|0
9|unnamed_taxon_ind|char(1)|0|NULL|0
10|name_usage|varchar(12)|1||0
11|unaccept_reason|varchar(50)|0|NULL|0
12|credibility_rtng|varchar(40)|1||0
13|completeness_rtng|char(10)|0|NULL|0
14|currency_rating|char(7)|0|NULL|0
15|phylo_sort_seq|smallint(6)|0|NULL|0
16|initial_time_stamp|datetime|1||0
17|parent_tsn|int(11)|0|NULL|0
18|taxon_author_id|int(11)|0|NULL|0
19|hybrid_author_id|int(11)|0|NULL|0
20|kingdom_id|smallint(6)|1||0
21|rank_id|smallint(6)|1||0
22|update_date|date|1||0
23|uncertain_prnt_ind|char(3)|0|NULL|0
24|n_usage|text|0||0
25|complete_name|tinytext|0||0
```

```
sqlite> PRAGMA table_info(vernaculars)
   ...> ;
0|tsn|int(11)|1||1
1|vernacular_name|varchar(80)|1||0
2|language|varchar(15)|1||0
3|approved_ind|char(1)|0|NULL|0
4|update_date|date|1||0
5|vern_id|int(11)|1||2
```

