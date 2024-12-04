import sys
import time
import logging
from typing import Optional, Callable
from datetime import datetime
from tqdm import tqdm

class ProgressMonitor:
    def __init__(self, total_steps: int = 100, description: str = "Processing"):
        self.total_steps = total_steps
        self.description = description
        self.progress_bar = tqdm(total=total_steps, desc=description, bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt}')
        
        # Setup logging
        self.logger = self._setup_logger()
        
    def _setup_logger(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('MCP_Monitor')
        logger.setLevel(logging.DEBUG)
        
        # Create handlers
        c_handler = logging.StreamHandler()
        f_handler = logging.FileHandler('mcp_debug.log')
        c_handler.setLevel(logging.WARNING)
        f_handler.setLevel(logging.DEBUG)
        
        # Create formatters and add it to handlers
        log_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        c_handler.setFormatter(log_format)
        f_handler.setFormatter(log_format)
        
        # Add handlers to the logger
        logger.addHandler(c_handler)
        logger.addHandler(f_handler)
        
        return logger
    
    def update(self, steps: int = 1, status: str = None):
        """Update progress bar and log status"""
        self.progress_bar.update(steps)
        if status:
            self.logger.info(status)
            
    def log_error(self, error: Exception, context: str = ""):
        """Log error with context"""
        error_msg = f"{context}: {str(error)}"
        self.logger.error(error_msg)
        self.progress_bar.write(f"Error: {error_msg}")
        
    def close(self):
        """Clean up resources"""
        self.progress_bar.close()

def monitor_operation(operation: Callable, description: str = "Processing", error_context: str = "") -> tuple:
    """
    Decorator to monitor operations with progress bar and error handling
    Returns: (success: bool, result: Any, error: Optional[Exception])
    """
    monitor = ProgressMonitor(description=description)
    try:
        monitor.update(10, "Initializing operation...")
        result = operation()
        monitor.update(90, "Operation completed successfully")
        return True, result, None
    except Exception as e:
        monitor.log_error(e, error_context)
        return False, None, e
    finally:
        monitor.close()
