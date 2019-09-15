# Ingesting legacy data into Tator Online

`scripts/ingestor.py` is the CLI front-end for ingestion of legacy json files

An example of injecting localization and track data looks like this:

```

# First import all the localizations
./ingestor.py localizations -i ~/working/groundfish_demo/GP040016_1080p_crop.json --url http://192.168.1.200/rest --token c2e88fa351229f8a699ac549cf3d80aae80189e8 --localizationTypeId 6 --map id:TrackID h:height w:width species:Name --ignore type --scale 0.666667

# Second, import all the tracks
./ingestor.py tracks -i ~/working/groundfish_demo/GP040016_1080p_crop.json --url http://192.168.1.200/rest --token c2e88fa351229f8a699ac549cf3d80aae80189e8 --localizationTypeId 6 --trackTypeId 7 --trackField TrackID --map id:TrackID --ignore type

```

## Parameters to pay close attention to

`trackTypeId` or `localizationTypeId` change from deployment to deploymenmt.

`trackField` is the attribute name for the integer that ties tracks together.

`scale` is to account for the fact localizations were done in 1080p coordinates
but the video has been transcoded to 720p for tator. 

`map` is used to change attribute names from the legacy json object to
the name required by the schema in tator online.

`ignore` can be used to explicitly discard object keys that are problematic
for the REST APIs. 

## If import went awry:

```
# In django shell:
>>> from main.models import EntityLocalizationBox
>>> media_el=EntityMediaBase.objects.get(pk=29)
>>> EntityLocalizationBox.objects.filter(media__in=media_el).delete()
```


