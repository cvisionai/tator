import os

for root, dirs, files in os.walk('src/js'):
    for fname in files:
        if not fname.endswith('.js'):
            continue
        depth = root.count('/')
        prefix = depth * '../'
        path = os.path.join(root, fname)
        with open(path, 'r') as f:
            content = f.read()
        if "extends TatorElement" in content:
            cls = "TatorElement"
            cls_file = "tator-element.js"
        elif "extends ModalDialog" in content:
            cls = "ModalDialog"
            cls_file = "modal-dialog.js"
        elif "extends TatorPage" in content:
            cls = "TatorPage"
            cls_file = "tator-page.js"
        else:
            print(f"Need manual mods for {path}!")
            continue
        content = ("import { " + cls + " } from \"" + prefix +
                   "../components/" + cls_file + ";\n\n" + content)
        content.replace("class ", "export class ")
        with open(path, 'w') as f:
            f.write(content)
        
