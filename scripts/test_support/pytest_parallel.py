import sys
import subprocess
import argparse
import os
import tempfile
import signal

from junitparser import JUnitXml, TestSuite

def merge_junit_reports(output_file, *input_files):
    merged_xml = JUnitXml()
    merged_suite = TestSuite("MergedResults")

    for file in input_files:
        xml = JUnitXml.fromfile(file)
        for suite in xml:
            for case in suite:
                merged_suite.add_testcase(case)

    merged_xml.add_testsuite(merged_suite)
    merged_xml.write(output_file)
    print(f"Merged results written to {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Pytest Wrapper")
    parser.add_argument("--num-workers", type=int, default=1, help="Number of workers to use")
    parser.add_argument("test_path", help="Test path to execute")
    parser.add_argument("pytest_args", nargs=argparse.REMAINDER, help="Additional pytest arguments")
    
    args = parser.parse_args()

    # Extract and modify --junitxml if present
    forwarded_args = []
    junitxml_path = None

    for arg in args.pytest_args:
        if arg.startswith("--junitxml="):
            junitxml_path = arg.split("=", 1)[1]  # Extract the path
        elif arg == "--junitxml":  # Handle separate arg case: --junitxml path
            junitxml_index = args.pytest_args.index(arg)
            if junitxml_index + 1 < len(args.pytest_args):
                junitxml_path = args.pytest_args[junitxml_index + 1]
                continue  # Skip adding this to forwarded_args
        else:
            forwarded_args.append(arg)

    if junitxml_path:
        print(f"Intercepted JUnit XML path: {junitxml_path}")

    print(f"Intercepted test path: {args.test_path}")
    print(f"Forwarding args: {forwarded_args}")

    # Execute pytest command in a loop once per python `test_file.py` file 
    # concat the junit xml path if given

    test_files = [x for x in os.listdir(args.test_path) if x.startswith("test_") and x.endswith(".py")]
    # Construct and execute pytest command

    returncode = 0
    procs = []

    # Register an interrupt handler such that on ctrl-C we kill all children
    def interrupt_handler(sig, frame):
        for proc in procs:
            proc.kill()
        sys.exit(1)
    signal.signal(signal.SIGINT, interrupt_handler)

    running = 0
    with tempfile.TemporaryDirectory() as tmpdir:
        for i, test in enumerate(test_files):
            if junitxml_path:
                forwarded_args.append(f"--junitxml={os.path.join(tmpdir, f'{test}_{i}.xml')}")
            fp = os.path.join(args.test_path, test)
            cmd = ["pytest", fp] + forwarded_args
            if running < args.num_workers:
                procs.append(subprocess.Popen(cmd))
                print(f"{i}: {cmd}")
                running += 1
            else:
                for proc in procs:
                    print(f"Waiting for process {i}")
                    returncode |= proc.wait()
                    print(f"Process {i} exited with code {returncode}")
                    running -= -1
                procs.append(subprocess.Popen(cmd))
                running += 1
                print(f"{i}: {cmd}")


        for i, proc in enumerate(procs):
            print(f"Waiting for process {i}")
            returncode |= proc.wait()
            print(f"Process {i} exited with code {returncode}")

        if junitxml_path:
            full_xml_paths = [os.path.join(tmpdir, x) for x in os.listdir(tmpdir) if x.endswith(".xml")]
            merge_junit_reports(junitxml_path, *full_xml_paths)
    
    if returncode != 0:
        print(f"ERROR: Pytest returned with non-zero exit code: {returncode}")
    # Forward exit code from pytest
    sys.exit(returncode)

if __name__ == "__main__":
    main()