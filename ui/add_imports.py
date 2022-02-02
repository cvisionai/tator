import os

symbols = {
    "TatorElement": "src/js/componeents/tator-element.js",
    "ModalDialog": "src/js/components/modal-dialog.js",
    "TatorPage": "src/js/components/tator-page.js",
    "UploadElement": "src/js/components/upload-element.js",
    "OrganizationTypeForm": "src/js/organization-settings/organization-type-form.js",
    "TypeForm": "src/js/project-settings/type-forms/type-form.js",
    "AnnotationCanvas": "src/js/annotator/annotation.js",
    "hasPermission": "src/js/util/has-permission.js",
    "getCookie": "src/js/util/get-cookie.js",
    "FilterConditionData": "src/js/util/filter-utilities.js",
    "FilterUtilities": "src/js/util/filter-utilities.js",
    "fetchRetry": "src/js/util/fetch-retry.js",
    "identifyingAttribute": "src/js/util/identifying-attribute.js",
    "joinParams": "src/js/util/join-params.js",
    "sameOriginCredentials": "src/js/util/same-origin-credentials.js",
    "TatorData": "src/js/util/tator-data.js",
    "Utilities": "src/js/util/utilities.js",
    "svgNamespace": "src/js/components/tator-element.js",
}

for root, dirs, files in os.walk('src/js'):
    for fname in files:
        if not fname.endswith('.js'):
            continue
        depth = root.count('/')
        prefix = (depth - 1) * '../'
        path = os.path.join(root, fname)
        with open(path, 'r') as f:
            content = f.read()
        for symbol in symbols:
            imports = ""
            if path != symbols[symbol] and symbol in content:
                print(f"TARGET PATH: {symbols[symbol]}")
                print(f"CURRENT PATH: {path}")
                rel = os.path.relpath(symbols[symbol], path)
                imports += "import { " + symbol + " } from \"" + rel + "\";\n"
            if imports:
                content = imports + "\n" + content
        content = content.replace("class ", "export class ")
        with open(path, 'w') as f:
            f.write(content)
        
