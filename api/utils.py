import joblib

def load_pkl_file(file_path):
    """Loads data from a .pkl file using joblib.

    Args:
        file_path (str): The path to the .pkl file.

    Returns:
        The unpickled Python object.
    """
    try:
        return joblib.load(file_path)
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return None
    except Exception as e:
        print(f"Error loading pickle file {file_path}: {e}")
        return None
