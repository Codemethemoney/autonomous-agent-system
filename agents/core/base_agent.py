from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import json
import logging
from datetime import datetime

class BaseAgent(ABC):
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        self.agent_id = agent_id
        self.config = config
        self.status = "initialized"
        self.last_heartbeat = datetime.now()
        self.task_queue = []
        self.logger = self._setup_logger()

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger(f"agent_{self.agent_id}")
        logger.setLevel(logging.DEBUG)
        handler = logging.FileHandler(f"logs/agent_{self.agent_id}.log")
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger

    @abstractmethod
    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task and return the result"""
        pass

    @abstractmethod
    async def handle_error(self, error: Exception, task: Dict[str, Any]) -> None:
        """Handle any errors that occur during task processing"""
        pass

    async def heartbeat(self) -> None:
        """Update agent's heartbeat timestamp"""
        self.last_heartbeat = datetime.now()
        self.logger.debug(f"Heartbeat updated: {self.last_heartbeat}")

    async def update_status(self, new_status: str) -> None:
        """Update agent's status"""
        self.status = new_status
        self.logger.info(f"Status updated to: {new_status}")

    def get_capabilities(self) -> List[str]:
        """Return list of agent capabilities"""
        return self.config.get("capabilities", [])
