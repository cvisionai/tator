import hashlib

def md5_sum(fname):
    """ Computes md5 sum of a file contents.
    """
    md5 = hashlib.md5()
    with open(fname, 'rb') as f:
        for chunk in iter(lambda: f.read(128*md5.block_size), b''):
            md5.update(chunk)
    return md5.hexdigest()
