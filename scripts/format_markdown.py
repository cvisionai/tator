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
            line = line.replace('# noqa: E501', '')
            if '**Parameters**' in line:
                skip_newlines = True
            if '**Returns**' in line:
                out.write('\n')
                skip_newlines = False
            if ((line.startswith('### tator') 
                 or line.startswith('### _class_')
                 or line.startswith('### _exception_'))
                and line.endswith(')\n')):
                func = line.split('(')[0].replace(' _class_', '').replace(' _exception_', '')
                signature = line.split(' ', 1)[1].strip('\n')
                out.write('----------------------------------\n\n')
                out.write(f"{func}\n\n")
                out.write(f"`{signature}`\n\n")
                continue
            if not (line.isspace() and skip_newlines):
                out.write(line)
    out.close()
