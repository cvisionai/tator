
import pytator
import tempfile
import os

def test_temporary_file(url, token, project):
    tator = pytator.Tator(url, token, project)

    all_temps = tator.TemporaryFile.all()
    assert  all_temps is not None
    assert len(all_temps) == 0
    
    with tempfile.NamedTemporaryFile(mode='w',suffix=".txt") as temp:
        temp.write("foo")
        temp.flush()
        tator.TemporaryFile.uploadFile(temp.name)
        all_temps = tator.TemporaryFile.all()
        assert len(all_temps) == 1

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_fp = os.path.join(temp_dir, "foo.txt")
        temp_element = tator.TemporaryFile.all()[0]
        tator.TemporaryFile.downloadFile(temp_element, temp_fp)
        with open(temp_fp, 'r') as temp_file:
            contents = temp_file.read()
            assert contents == "foo"
        
        
    

