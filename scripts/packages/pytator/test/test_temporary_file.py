
import pytator
import tempfile

def test_temporary_file(url, token, project):
    tator = pytator.Tator(url, token, project)

    with tempfile.NamedTemporaryFile(suffix=".txt") as temp:
        all_temps = tator.TemporaryFile.all()
        assert  all_temps is not None
        assert len(all_temps) == 0
        tator.TemporaryFile.uploadFile(temp.name)
        all_temps = tator.TemporaryFile.all()
        assert len(all_temps) == 1
        
    

