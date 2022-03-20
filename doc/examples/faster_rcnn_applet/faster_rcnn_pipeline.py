import nvidia.dali as dali
import nvidia.dali.types as types

def parse_args():
    import argparse
    parser = argparse.ArgumentParser(description="Serializee the pipeline and save it to a file.")
    parser.add_argument('file_path', type=str, help='The path where to save the serialized pipeline')
    return parser.parse_args()


@dali.pipeline_def(batch_size=3, num_threads=1, device_id=0)
def pipe():
    images = dali.fn.external_source(device="cpu", name="DALI_INPUT_0")
    images = dali.fn.decoders.image(images, device="mixed", output_type=types.RGB)
    images = dali.fn.resize(images, resize_x=1024, resize_y=600)
    return images


def main(filename):
    pipe().serialize(filename=filename)


if __name__ == '__main__':
    args = parse_args()
    main(args.file_path)
