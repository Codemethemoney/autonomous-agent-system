import time
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

class RateLimiter:
    def __init__(self, requests_per_minute: int = 50, requests_per_hour: int = 500):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_requests: Dict[str, int] = {}
        self.hour_requests: Dict[str, int] = {}
        self.last_reset_minute = datetime.now()
        self.last_reset_hour = datetime.now()
        self.logger = logging.getLogger("rate_limiter")
        self._setup_logger()

    def _setup_logger(self):
        handler = logging.FileHandler('logs/rate_limiter.log')
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    async def wait_if_needed(self, model: str) -> None:
        """Wait if rate limit is reached"""
        while self._is_rate_limited(model):
            wait_time = self._calculate_wait_time(model)
            self.logger.warning(f"Rate limit reached for {model}. Waiting {wait_time} seconds...")
            await asyncio.sleep(wait_time)

    def _is_rate_limited(self, model: str) -> bool:
        self._reset_counters_if_needed()
        minute_requests = self.minute_requests.get(model, 0)
        hour_requests = self.hour_requests.get(model, 0)
        return (minute_requests >= self.requests_per_minute or 
                hour_requests >= self.requests_per_hour)

    def _calculate_wait_time(self, model: str) -> int:
        """Calculate how long to wait before next request"""
        if self.minute_requests.get(model, 0) >= self.requests_per_minute:
            return 60 - (datetime.now() - self.last_reset_minute).seconds
        if self.hour_requests.get(model, 0) >= self.requests_per_hour:
            return 3600 - (datetime.now() - self.last_reset_hour).seconds
        return 1

    def _reset_counters_if_needed(self):
        """Reset counters if time period has elapsed"""
        now = datetime.now()
        
        # Reset minute counters
        if (now - self.last_reset_minute) >= timedelta(minutes=1):
            self.minute_requests = {}
            self.last_reset_minute = now
            self.logger.info("Reset minute counters")
            
        # Reset hour counters
        if (now - self.last_reset_hour) >= timedelta(hours=1):
            self.hour_requests = {}
            self.last_reset_hour = now
            self.logger.info("Reset hour counters")

    def increment_counter(self, model: str):
        """Increment request counters for the model"""
        self._reset_counters_if_needed()
        self.minute_requests[model] = self.minute_requests.get(model, 0) + 1
        self.hour_requests[model] = self.hour_requests.get(model, 0) + 1
        self.logger.debug(f"Incremented counters for {model}: minute={self.minute_requests[model]}, hour={self.hour_requests[model]}")

class ModelRotator:
    def __init__(self, models: Dict[str, Dict]):
        """
        Initialize with model configurations
        models = {
            "gpt-4": {"priority": 1, "enabled": True},
            "gpt-3.5-turbo": {"priority": 2, "enabled": True},
            ...
        }
        """
        self.models = models
        self.current_model = self._get_highest_priority_model()
        self.logger = logging.getLogger("model_rotator")
        self._setup_logger()

    def _setup_logger(self):
        handler = logging.FileHandler('logs/model_rotator.log')
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def _get_highest_priority_model(self) -> Optional[str]:
        """Get the highest priority enabled model"""
        available_models = [(name, config) for name, config in self.models.items() 
                          if config.get("enabled", True)]
        if not available_models:
            return None
        return min(available_models, key=lambda x: x[1]["priority"])[0]

    def get_current_model(self) -> Optional[str]:
        """Get the current model to use"""
        return self.current_model

    def rotate_model(self) -> Optional[str]:
        """Rotate to the next available model"""
        current_priority = self.models[self.current_model]["priority"]
        next_models = [(name, config) for name, config in self.models.items()
                      if config["priority"] > current_priority and config.get("enabled", True)]
        
        if not next_models:
            self.logger.warning("No more models available for rotation")
            return None
            
        self.current_model = min(next_models, key=lambda x: x[1]["priority"])[0]
        self.logger.info(f"Rotated to model: {self.current_model}")
        return self.current_model

    def disable_model(self, model: str):
        """Disable a model (e.g., when it hits rate limits)"""
        if model in self.models:
            self.models[model]["enabled"] = False
            self.logger.warning(f"Disabled model: {model}")
            if model == self.current_model:
                self.current_model = self._get_highest_priority_model()
                self.logger.info(f"Switched to model: {self.current_model}")

    def enable_model(self, model: str):
        """Re-enable a model"""
        if model in self.models:
            self.models[model]["enabled"] = True
            self.logger.info(f"Enabled model: {model}")
            # If this model has higher priority than current, switch to it
            if (self.current_model and 
                self.models[model]["priority"] < self.models[self.current_model]["priority"]):
                self.current_model = model
                self.logger.info(f"Switched to higher priority model: {model}")
