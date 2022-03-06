import argparse

def parse_args():
    parser = argparse.ArgumentParser(description="Formats markdown doc")
    parser.add_argument('in_file', help="File to format")
    parser.add_argument('out_file', help="Output file")
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_args()
    out = open(args.out_file, 'w')
    with open(args.in_file, 'r') as f:
        skip_newlines = False
        for line in f:
            if '**Parameters**' in line:
                skip_newlines = True
            if '**Returns**' in line:
                out.write('\n')
                skip_newlines = False
            if line.startswith('### tator') and line.endswith(')\n'):
                func = line.split('(')[0]
                signature = line.split(' ', 1)[1].strip('\n')
                out.write('----------------------------------\n')
                out.write(f"{func}\n")
                out.write(f"`{signature}`\n")
                continue
            if not (line.isspace() and skip_newlines):
                out.write(line)
    out.close()
