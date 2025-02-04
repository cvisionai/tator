media_properties = {
    "name": {
        "description": "Name of the media.",
        "type": "string",
    },
    "media_files": {"$ref": "#/components/schemas/MediaFiles"},
    "last_edit_start": {
        "description": "Datetime of the start of the session when this media or its annotations "
        "were last edited.",
        "type": "string",
        "format": "date-time",
    },
    "last_edit_end": {
        "description": "Datetime of the end of the session when this media or its annotations "
        "were last edited.",
        "type": "string",
        "format": "date-time",
    },
    "attributes": {
        "description": "Object containing attribute values.",
        "type": "object",
        "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
    },
    "elemental_id": {
        "description": "The elemental ID of the object.",
        "type": "string",
        "nullable": True,
    },
}

media_get_properties = {
    "id": {
        "type": "integer",
        "description": "Unique integer identifying this media.",
    },
    "project": {
        "type": "integer",
        "description": "Unique integer identifying project of this media.",
    },
    "type": {
        "type": "integer",
        "description": "Unique integer identifying entity type of this media.",
    },
    "created_datetime": {
        "type": "string",
        "description": "Datetime when this media was created.",
    },
    "created_by": {
        "type": "integer",
        "description": "Unique integer identifying user who created this media.",
    },
    "modified_datetime": {
        "type": "string",
        "description": "Datetime when this media was last modified.",
    },
    "modified_by": {
        "type": "integer",
        "description": "Unique integer identifying user who last modified this media.",
    },
    "md5": {
        "type": "string",
        "description": "MD5 checksum of the media file.",
    },
    "num_frames": {
        "type": "integer",
        "description": "Number of frames for videos.",
    },
    "fps": {
        "type": "number",
        "description": "Frame rate for videos.",
    },
    "codec": {
        "type": "string",
        "description": "Codec for videos.",
    },
    "width": {
        "type": "integer",
        "description": "Horizontal resolution in pixels.",
    },
    "height": {
        "type": "integer",
        "description": "Vertical resolution in pixels.",
    },
    "summary_level": {
        "description": "If supplied, this video is best summarized at this frame interval",
        "type": "integer",
    },
    "gid": {
        "description": "Group ID for the upload group of this media.",
        "type": "string",
    },
    "uid": {
        "description": "Unique ID for the upload of this media.",
        "type": "string",
    },
}

media_spec = {
    "type": "object",
    "required": ["type", "name", "md5"],
    "properties": {
        "type": {
            "description": "Unique integer identifying a media type. Use "
            "-1 to automatically select the media type if "
            "only one media type exists in a project.",
            "type": "integer",
            "minimum": -1,
        },
        "gid": media_get_properties["gid"],
        "uid": media_get_properties["uid"],
        "url": {
            "description": "Upload URL for the image if this is an image type, URL "
            "of hosted original media if this is a video type. For video "
            "types this field is just for reference.",
            "type": "string",
        },
        "thumbnail_url": {
            "description": "Upload URL for the media thumbnail if already generated.",
            "type": "string",
        },
        "thumbnail_gif_url": {
            "description": "Upload URL for the video gif thumbnail if already generated.",
            "type": "string",
        },
        "section": {
            "description": "Media section name.",
            "type": "string",
        },
        "section_id": {
            "description": "Media section ID. If given `section` is ignored.",
            "type": "integer",
        },
        "name": {
            "description": "Name of the file.",
            "type": "string",
        },
        "md5": {
            "description": "MD5 sum of the media file.",
            "type": "string",
        },
        "num_frames": {
            "type": "integer",
            "description": "Number of frames for videos.",
            "nullable": True,
        },
        "fps": {
            "type": "number",
            "description": "Frame rate for videos.",
            "nullable": True,
        },
        "codec": {
            "type": "string",
            "description": "Codec for videos.",
            "nullable": True,
        },
        "width": {
            "type": "integer",
            "description": "Horizontal resolution in pixels.",
            "nullable": True,
        },
        "height": {
            "type": "integer",
            "description": "Vertical resolution in pixels.",
            "nullable": True,
        },
        "summary_level": {
            "description": "If supplied, this video is best summarized at this frame interval",
            "type": "integer",
        },
        "attributes": {
            "nullable": True,
            "description": "Object containing attribute values.",
            "type": "object",
            "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
        },
        "elemental_id": {"description": "Unique ID of an element", "type": "string"},
        "user_elemental_id": {
            "description": "Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id",
            "type": "string",
        },
        "reference_only": {
            "description": "Do not import the media resources into Tator. This causes the image to be accessed at the supplied URL upon access in the UI. Attempts loading the image from the URL, but fall back to other records if the URL is not accessible.",
            "type": "integer",
            "default": 0,
            "maximum": 1,
        },
    },
}

media_update = {
    "type": "object",
    "properties": {
        **media_properties,
        "num_frames": {
            "description": "Number of frames in the video.",
            "type": "integer",
            "minimum": 0,
        },
        "fps": {
            "description": "Frame rate of the video.",
            "type": "number",
        },
        "codec": {
            "description": "Codec of the original video.",
            "type": "string",
        },
        "width": {
            "description": "Pixel width of the video.",
            "type": "integer",
        },
        "height": {
            "description": "Pixel height of the video.",
            "type": "integer",
        },
        "summary_level": {
            "description": "If supplied, this video is best summarized at this frame interval",
            "type": "integer",
        },
        "multi": {"$ref": "#/components/schemas/MultiDefinition"},
        "live": {"$ref": "#/components/schemas/LiveUpdateDefinition"},
        "concat": {
            "description": "List of concated videos",
            "type": "array",
            "items": {"$ref": "#/components/schemas/ConcatDefinition"},
        },
        "archive_state": {
            "type": "string",
            "description": "Marks media for archival or retrieval. Media may not be set directly "
            "to `live` or `archived`, the system performs that transition for the "
            "user.",
            "enum": ["to_archive", "to_live"],
        },
        "elemental_id": {"description": "Unique ID of an element", "type": "string"},
        "user_elemental_id": {
            "description": "Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id",
            "type": "string",
        },
        "null_attributes": {
            "description": "Null a value in the attributes body",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
        "reset_attributes": {
            "description": "Reset an attribute to the default value specified in the Type object",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
    },
}

media_id_query = {
    "type": "object",
    "properties": {
        "ids": {
            "description": "Array of media IDs to retrieve.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        "localization_ids": {
            "description": "Array of child localization IDs for which media should "
            "be retrieved.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        "state_ids": {
            "description": "Array of child state IDs for which media should " "be retrieved.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        "float_array": {
            "description": "Searches on `float_array` attributes.",
            "type": "array",
            "items": {"$ref": "#/components/schemas/FloatArrayQuery"},
        },
        "object_search": {"$ref": "#/components/schemas/AttributeOperationSpec"},
    },
}

media_bulk_update = {
    "type": "object",
    "properties": {
        "attributes": {
            "description": "Attribute values to bulk update an entity list.",
            "type": "object",
            "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
        },
        "archive_state": {
            "type": "string",
            "description": "Marks media for archival or retrieval. Media may not be set directly "
            "to `live` or `archived`, the system performs that transition for the "
            "user.",
            "enum": ["to_archive", "to_live"],
        },
        "user_elemental_id": {
            "description": "Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id",
            "type": "string",
        },
        "ids": {
            "description": "Specific IDs to update. This is applied in addition to query "
            "parameters.",
            "type": "array",
            "items": {"type": "integer"},
        },
        **media_id_query["properties"],
        "null_attributes": {
            "description": "Null a value in the attributes body",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
        "reset_attributes": {
            "description": "Reset an attribute to the default value specified in the Type object",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
    },
}

media = {
    "type": "object",
    "properties": {
        **media_properties,
        **media_get_properties,
        "archive_state": {
            "type": "string",
            "description": "The current archival state of the media.",
            "enum": ["archived", "to_archive", "live", "to_live"],
        },
        "archive_status_date": {
            "description": "Datetime of the last change to the `archive_state` field.",
            "type": "string",
            "format": "date-time",
        },
        "incident": {
            "description": "If doing a related search, will contain the number of matching metadata hits in this media.",
            "type": "integer",
            "nullable": True,
        },
        "effective_permission": {
            "description": "Calculated permission for this value",
            "type": "integer",
            "nullable": True,
        },
    },
}
