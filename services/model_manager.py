import json
import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from utils.rate_limiter import RateLimiter, ModelRotator

class ModelManager:
    def __init__(self, config_path: str = "config/model_config.json"):
        self.config_path = config_path
        self.logger = self._setup_logger()
        self.models = self._load_config()
        self.rate_limiter = RateLimiter()
        self.model_rotator = ModelRotator(self.models)
        self.current_model = self.model_rotator.get_current_model()
        self.retry_delay = 5  # seconds between retries
        self.max_retries = 3

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("model_manager")
        handler = logging.FileHandler('logs/model_manager.log')
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        return logger

    def _load_config(self) -> Dict[str, Any]:
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            return config.get('models', {})
        except Exception as e:
            self.logger.error(f"Error loading model config: {str(e)}")
            return {}

    async def get_available_model(self, required_capabilities: List[str] = None) -> Optional[str]:
        """Get an available model that meets the capability requirements"""
        while True:
            model = self.model_rotator.get_current_model()
            if not model:
                self.logger.error("No models available")
                return None

            if required_capabilities:
                model_capabilities = self.models[model].get('capabilities', [])
                if not all(cap in model_capabilities for cap in required_capabilities):
                    self.logger.warning(f"Model {model} doesn't have required capabilities")
                    if not self.model_rotator.rotate_model():
                        return None
                    continue

            # Check if model is rate limited
            if await self.rate_limiter.wait_if_needed(model):
                self.logger.info(f"Model {model} is rate limited, rotating to next model")
                if not self.model_rotator.rotate_model():
                    return None
                continue

            return model

    async def execute_with_model(self, operation: callable, required_capabilities: List[str] = None) -> Any:
        """Execute an operation with automatic model rotation and rate limit handling"""
        retries = 0
        last_error = None

        while retries < self.max_retries:
            model = await self.get_available_model(required_capabilities)
            if not model:
                raise Exception("No available models meet the requirements")

            try:
                # Increment counter before making the request
                self.rate_limiter.increment_counter(model)
                
                # Execute the operation with the selected model
                result = await operation(model)
                return result

            except Exception as e:
                last_error = e
                error_message = str(e).lower()
                
                if "rate limit" in error_message:
                    self.logger.warning(f"Rate limit hit for model {model}")
                    self.model_rotator.disable_model(model)
                    # Wait before trying next model
                    await asyncio.sleep(self.retry_delay)
                else:
                    self.logger.error(f"Error executing operation with model {model}: {str(e)}")
                    retries += 1
                    await asyncio.sleep(self.retry_delay)

        raise Exception(f"Failed after {self.max_retries} retries. Last error: {str(last_error)}")

    async def schedule_model_reactivation(self, model: str, delay_minutes: int = 60):
        """Schedule a model to be reactivated after a delay"""
        self.logger.info(f"Scheduling reactivation of model {model} in {delay_minutes} minutes")
        await asyncio.sleep(delay_minutes * 60)
        self.model_rotator.enable_model(model)
        self.logger.info(f"Reactivated model {model}")

    def get_model_status(self) -> Dict[str, Any]:
        """Get current status of all models"""
        status = {}
        for model_name, model_config in self.models.items():
            status[model_name] = {
                "enabled": model_config.get("enabled", True),
                "priority": model_config.get("priority"),
                "capabilities": model_config.get("capabilities", []),
                "is_current": model_name == self.current_model
            }
        return status

# Example usage:
async def example_usage():
    manager = ModelManager()
    
    # Example operation that uses a model
    async def generate_code(model: str) -> str:
        # Simulate an API call
        await asyncio.sleep(1)
        return f"Generated code using {model}"
    
    try:
        # Execute with automatic model management
        result = await manager.execute_with_model(
            lambda model: generate_code(model),
            required_capabilities=["code_generation"]
        )
        print(result)
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(example_usage())
