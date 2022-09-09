import argparse
import os
import subprocess

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
        if title == 'api':
            title = title.upper()
        else:
            title = title.capitalize()
        out.write('---\n')
        out.write(f'title: {title}\n')
        out.write('---\n\n\n')
        if title.lower() == 'models':
            out.write(':::note\n\n')
            out.write('Each of the models below include the following two functions:\n')
            out.write('* `to_dict()` - Converts the class into a dictionary.\n')
            out.write('* `to_str()` - Serializes the class as a string.\n')
            out.write('\n:::\n')
        skip_newlines = False
        skip_section = False
        skip_parameter = False
        skip_sync_blurb = False
        property_name = ""
        for line in f:
            if line.startswith('#### openapi_types') or line.startswith('#### attribute_map'):
                continue
            # Skip sections with "http_info"
            if line.startswith('### tator'):
                skip_section = 'with_http_info' in line
                skip_parameter = False
            if skip_section:
                continue
            # Skip parameters that are repeated everywhere
            if line.startswith('    * **'):
                skip_parameter = '_preload_content' in line \
                                 or '_request_timeout' in line \
                                 or 'async_req' in line
            if skip_parameter:
                continue
            # Skip asynchronous request blurb
            if line.startswith('This method makes a synch'):
                skip_sync_blurb = True
            if line.startswith('* **') and skip_sync_blurb:
                out.write('\n')
                skip_sync_blurb = False
            if skip_sync_blurb:
                continue
            # Reformat property docs
            if line.startswith('#### _property_'):
                line = line.replace('#### _property_ ', '**')
                line = line.replace('()', '**')
                property_name = line.strip('\n')
                desc_next = True
                type_next = False
                continue
            if property_name:
                if desc_next:
                    description = line.strip('\n')
                    desc_next = False
                if line.startswith('* **Return type**'):
                    type_next = True
                    lines_to_skip = 5
                if type_next:
                    if lines_to_skip:
                        if len(line) > 1:
                            type = line.strip(' \n')
                        lines_to_skip -= 1
                    else:
                        out.write(f"* {property_name} (*{type}*) - {description}\n\n")
                        property_name = ""
                        type_next = False
                continue
            line = line.replace('# noqa: E501', '')
            line = line.replace('models.md#tator.models.', 'models.md#')
            line = line.replace('api.md#tator.api.', 'api.md#')
            line = line.replace(', local_vars_configuration=None', '')
            hash_start = line.find('models.md#')
            hash_end = line.rfind(')')
            if hash_start != -1 and hash_end != -1:
                line = line[:hash_start] + line[hash_start:hash_end].lower() + line[hash_end:]
            if '**Parameters**' in line:
                skip_newlines = True
            if '**Returns**' in line and title.lower() != 'models':
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
            if not ((line.isspace() and skip_newlines) or title.lower() == 'models'):
                out.write(line)
            if line.startswith('## REST API'):
                out.write("\n:::note\n\n")
                out.write("The following parameters are shared by all functions described below:\n\n")
                out.write("* **async_req** (*bool*) – execute request asynchronously\n\n")
                out.write("* **_preload_content** – if False, the urllib3.HTTPResponse object will be returned without reading/decoding response data. Default is True.\n\n")
                out.write("* **_request_timeout** – timeout setting for this request. If one number provided, it will be total request timeout. It can also be a pair (tuple) of (connection, read) timeouts. Default is 300.\n\n")
                out.write(":::")
    out.close()
    subprocess.run(['scripts/fix_links.sh', args.out_file], check=True)
