from typing import Dict, Any, List
from .base_agent import BaseAgent
from services.model_manager import ModelManager

class ModelAgent(BaseAgent):
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, config)
        self.model_manager = ModelManager()
        self.required_capabilities = config.get("required_capabilities", [])

    async def execute_with_model(self, operation: callable) -> Any:
        """Execute an operation using the model manager"""
        return await self.model_manager.execute_with_model(
            operation,
            required_capabilities=self.required_capabilities
        )

    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task using model rotation and rate limiting"""
        try:
            self.logger.info(f"Processing task with model agent: {task.get('id')}")
            
            async def model_operation(model: str) -> Dict[str, Any]:
                # Implement the actual model operation here
                # This should be overridden by specific agent implementations
                raise NotImplementedError("Model operation must be implemented by specific agents")
            
            result = await self.execute_with_model(model_operation)
            
            return {
                "task_id": task.get("id"),
                "status": "completed",
                "result": result
            }
            
        except Exception as e:
            self.logger.error(f"Error in model agent: {str(e)}")
            await self.handle_error(e, task)
            return {
                "task_id": task.get("id"),
                "status": "failed",
                "error": str(e)
            }

    async def handle_error(self, error: Exception, task: Dict[str, Any]) -> None:
        """Handle errors in model operations"""
        self.logger.error(f"Error processing task {task.get('id')}: {str(error)}")
        await self.update_status("error")
        
        # If it's a rate limit error, log additional information
        if "rate limit" in str(error).lower():
            self.logger.warning("Rate limit error encountered, model rotation will be handled automatically")
            
        # Implement specific error recovery logic here if needed
        
    def get_model_status(self) -> Dict[str, Any]:
        """Get current status of models used by this agent"""
        return self.model_manager.get_model_status()
