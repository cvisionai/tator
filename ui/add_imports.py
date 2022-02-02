import os

for root, dirs, files in os.walk('src/js'):
    for fname in files:
        if not fname.endswith('.js'):
            continue
        depth = root.count('/')
        prefix = (depth - 1) * '../'
        path = os.path.join(root, fname)
        with open(path, 'r') as f:
            content = f.read()
        if "extends TatorElement" in content:
            cls = "TatorElement"
            cls_file = "components/tator-element.js"
        elif "extends ModalDialog" in content:
            cls = "ModalDialog"
            cls_file = "components/modal-dialog.js"
        elif "extends TatorPage" in content:
            cls = "TatorPage"
            cls_file = "components/tator-page.js"
        elif "extends HTMLElement" in content:
            continue
        elif "extends UploadElement" in content:
            cls = "UploadElement"
            cls_file = "components/upload-element.js"
        elif "extends OrganizationTypeForm" in content:
            cls = "OrganizationTypeForm"
            cls_file = "organization-settings/organization-type-form.js"
        elif "extends TypeForm" in content:
            cls = "TypeForm"
            cls_file = "project-settings/type-forms/type-form.js"
        elif "extends AnnotationCanvas" in content:
            cls = "AnnotationCanvas"
            cls_file = "annotator/annotation.js"
        else:
            print(f"Need manual mods for {path}!")
            continue
        content = ("import { " + cls + " } from \"" + prefix +
                   cls_file + "\";\n\n" + content)
        content = content.replace("class ", "export class ")
        with open(path, 'w') as f:
            f.write(content)
        
