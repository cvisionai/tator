import argparse
import os

def parse_args():
    parser = argparse.ArgumentParser(description="Formats markdown doc")
    parser.add_argument('in_file', help="File to format")
    parser.add_argument('out_file', help="Output file")
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_args()
    out = open(args.out_file, 'w')
    with open(args.in_file, 'r') as f:
        title = os.path.splitext(os.path.basename(args.out_file))[0]
        title = title.capitalize()
        out.write('---\n')
        out.write(f'title: {title}\n')
        out.write('---\n\n\n')
        skip_newlines = False
        for line in f:
            if line.startswith('#### openapi_types') or line.startswith('#### attribute_map'):
                continue
            line = line.replace('# noqa: E501', '')
            line = line.replace('models.md#tator.models.', 'models.md#')
            line = line.replace('api.md#tator.api.', 'api.md#')
            hash_start = line.find('models.md#')
            hash_end = line.rfind(')')
            if hash_start != -1 and hash_end != -1:
                line = line[:hash_start] + line[hash_start:hash_end].lower() + line[hash_end:]
            if '**Parameters**' in line:
                skip_newlines = True
            if '**Returns**' in line:
                out.write('\n')
                skip_newlines = False
            if ((line.startswith('### tator') 
                 or line.startswith('### _class_')
                 or line.startswith('### _exception_'))
                and line.endswith(')\n')):
                func = line.split('(')[0].replace(' _class_', '').replace(' _exception_', '').split('.')[-1]
                signature = line.split(' ', 1)[1].strip('\n')
                out.write('----------------------------------\n\n')
                out.write(f"### {func}\n\n")
                out.write(f"{signature}\n\n")
                continue
            if not (line.isspace() and skip_newlines):
                out.write(line)
    out.close()
