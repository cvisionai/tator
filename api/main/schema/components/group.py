group_properties = {
    "id": {"description": "Primary key of the group", "type": "integer"},
    "name": {"description": "Group Name", "type": "string"},
    "organization": {"description": "Organization the group falls under", "type": "integer"},
    "members": {
        "description": "List of members in the group (user pk)",
        "type": "array",
        "items": {"type": "integer"},
    },
}


post_properties = {**group_properties}
del post_properties["members"]
del post_properties["id"]
del post_properties["organization"]  # can't post organization in body, its in the URL

post_properties["initial_members"] = {
    "description": "List of members to add to the group upon creation (user pk)",
    "type": "array",
    "items": {"type": "integer"},
}

# The spec used by POST methods
group_spec = {
    "type": "object",
    "required": ["name"],
    "properties": post_properties,
}

patch_properties = {**post_properties}
del patch_properties["initial_members"]  # can't patch initial members

patch_properties["add_members"] = {
    "description": "List of members to add to the group (user pk)",
    "type": "array",
    "items": {"type": "integer"},
}
patch_properties["remove_members"] = {
    "description": "List of members to add to the group (user pk)",
    "type": "array",
    "items": {"type": "integer"},
}
# The spec used by PATCH methods
group_update_spec = {"type": "object", "properties": patch_properties}

# The spec used by GET methods
group = {
    "type": "object",
    "description": "Group object.",
    "properties": {
        **group_properties,
    },
}
