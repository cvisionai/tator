from main.models import *
import logging
import os

logger = logging.getLogger(__name__)

""" Utility scripts for data management in django-shell """

def clearDataAboutMedia(id):
    """
    Given an id Delete all states, localizations that apply.

    :param id: The id of the media element to purge metadata about.
    """
    #Delete all states by hitting associations which auto delete states
    qs=AssociationType.objects.filter(media__in=[id])
    qs.delete()

    #Delete all localizations
    qs=EntityLocalizationBase.objects.filter(media=id)
    qs.delete()

def makeLocalizationsRelative():
    boxes=EntityLocalizationBox.objects.filter(relativeCoords=False)
    lines=EntityLocalizationLine.objects.filter(relativeCoords=False)
    dots=EntityLocalizationDot.objects.filter(relativeCoords=False)

    for box in boxes:
        media=box.media
        box.height = box.height / media.height
        box.y = box.y / media.height
        box.width = box.width / media.width
        box.x = box.x / media.width
        box.relativeCoords = True
        box.save()

    for line in lines:
        media=line.media
        line.y0 = line.y0 / media.height
        line.y1 = line.y1 / media.height
        line.x0 = line.x0 / media.width
        line.x1 = line.x1 / media.width
        line.relativeCoords = True
        line.save()

    for dot in dots:
        media=dot.media
        dot.y = dot.y / media.height
        dot.x = dot.x / media.width
        dot.relativeCoords = True
        dot.save()

def updateProjectTotals():
    projects=Project.objects.all()
    for project in projects:
        files = EntityMediaBase.objects.filter(project=project)
        if files.count() != project.num_files:
            project.num_files = files.count()
            project.size = 0
            for file in files:
                try:
                    project.size += file.file.size
                    project.size += file.thumbnail.size
                    if isinstance(file, EntityMediaVideo):
                        if file.original:
                            statinfo = os.stat(file.original)
                            project.size = project.size + statinfo.st_size
                        project.size += file.thumbnail_gif.size
                except:
                    pass
            logger.info(f"Updating {project.name}: Num files = {project.num_files}, Size = {project.size}")
            project.save()

def moveCompletedAlgRuns(project_id, from_section, to_section):
    results = AlgorithmResult.objects.filter(
        algorithm__project=project_id,
        media__attributes__tator_user_sections=from_section,
        result=JobResult.FINISHED,
    )
    count = 0
    for result in results:
        for media in result.media.all():
            media.attributes['tator_user_sections'] = to_section
            media.save()
            count += 1
    print(f"Moved {count} files.")

def updateSearchVectors():
    qs = EntityBase.objects.all()
    qs.update(search_vector=SearchVector('attributes'))
