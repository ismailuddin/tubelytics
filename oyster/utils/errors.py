class Error(Exception):
    """Base class for exceptions in this module."""
    pass

class ETLError(Error):
    """Base class for handling ETL errors"""
    pass

class PreprocessingError(Error):
    """Base class for handling pre-processing errors"""
    
    def __init__(self, message: str):
        self.message = message

    def __str__(self):
        return repr(self.message)