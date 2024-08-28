import os

def arrow_to_camel(dname):
    tokens = dname.split('-')
    return ''.join([t.capitalize() for t in tokens])

if __name__ == '__main__':
    for root, dirs, files in os.walk("src"):
        path = os.path.join(root, "index.js")
        with open(path, 'w') as f:
            for fname in files:
                if fname == 'index.js':
                    continue
                f.write(f"export * from \"./{fname}\";\n")
            for dname in dirs:
                f.write(f"export * as {arrow_to_camel(dname)} from \"./{dname}/index.js\";\n")
