import json
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
from ..core.base_agent import BaseAgent
from ..implementations.code_analyzer_agent import CodeAnalyzerAgent
# Import other agent implementations as needed

class AgentManager:
    def __init__(self, config_path: str = "agents/config/agent_registry.json"):
        self.agents: Dict[str, BaseAgent] = {}
        self.workflows: Dict[str, List[str]] = {}
        self.logger = self._setup_logger()
        self.load_configuration(config_path)
        self.task_queue = asyncio.Queue()
        self.running = False

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("agent_manager")
        logger.setLevel(logging.DEBUG)
        handler = logging.FileHandler("logs/agent_manager.log")
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger

    def load_configuration(self, config_path: str) -> None:
        """Load agent configuration from file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                
            # Initialize agents
            for agent_id, agent_config in config["agents"].items():
                if agent_config["enabled"]:
                    self.create_agent(agent_id, agent_config)
                    
            # Load workflows
            self.workflows = config.get("workflows", {})
            
            self.logger.info("Configuration loaded successfully")
        except Exception as e:
            self.logger.error(f"Error loading configuration: {str(e)}")
            raise

    def create_agent(self, agent_id: str, config: Dict[str, Any]) -> None:
        """Create and register a new agent"""
        try:
            agent_type = config["type"]
            if agent_type == "analysis":
                agent = CodeAnalyzerAgent(agent_id, config)
            # Add other agent types here
            else:
                raise ValueError(f"Unknown agent type: {agent_type}")
                
            self.agents[agent_id] = agent
            self.logger.info(f"Agent created: {agent_id}")
        except Exception as e:
            self.logger.error(f"Error creating agent {agent_id}: {str(e)}")
            raise

    async def start(self) -> None:
        """Start the agent manager"""
        self.running = True
        self.logger.info("Agent manager started")
        await asyncio.gather(
            self.process_task_queue(),
            self.monitor_agents()
        )

    async def stop(self) -> None:
        """Stop the agent manager"""
        self.running = False
        self.logger.info("Agent manager stopped")

    async def submit_task(self, task: Dict[str, Any], workflow: str = None) -> str:
        """Submit a task for processing"""
        task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.task_queue._queue)}"
        task["id"] = task_id
        task["submitted_at"] = datetime.now().isoformat()
        task["workflow"] = workflow
        
        await self.task_queue.put(task)
        self.logger.info(f"Task submitted: {task_id}")
        return task_id

    async def process_task_queue(self) -> None:
        """Process tasks in the queue"""
        while self.running:
            try:
                if not self.task_queue.empty():
                    task = await self.task_queue.get()
                    workflow = task.get("workflow")
                    
                    if workflow and workflow in self.workflows:
                        # Process task through workflow
                        result = await self.execute_workflow(workflow, task)
                    else:
                        # Process task with single agent
                        agent_id = task.get("agent_id")
                        if agent_id in self.agents:
                            result = await self.agents[agent_id].process_task(task)
                        else:
                            raise ValueError(f"Unknown agent: {agent_id}")
                            
                    self.logger.info(f"Task completed: {task['id']}")
                    
                await asyncio.sleep(0.1)  # Prevent CPU overload
                
            except Exception as e:
                self.logger.error(f"Error processing task: {str(e)}")

    async def execute_workflow(self, workflow_name: str, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a workflow with multiple agents"""
        workflow_agents = self.workflows[workflow_name]
        result = task
        
        for agent_id in workflow_agents:
            if agent_id in self.agents:
                result = await self.agents[agent_id].process_task(result)
            else:
                self.logger.warning(f"Agent {agent_id} not found in workflow {workflow_name}")
                
        return result

    async def monitor_agents(self) -> None:
        """Monitor agent health and status"""
        while self.running:
            try:
                for agent_id, agent in self.agents.items():
                    # Check last heartbeat
                    if datetime.now() - agent.last_heartbeat > timedelta(minutes=5):
                        self.logger.warning(f"Agent {agent_id} may be unresponsive")
                        await agent.update_status("warning")
                        
                    # Update heartbeat
                    await agent.heartbeat()
                    
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Error monitoring agents: {str(e)}")

    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific agent"""
        if agent_id in self.agents:
            agent = self.agents[agent_id]
            return {
                "id": agent_id,
                "status": agent.status,
                "last_heartbeat": agent.last_heartbeat.isoformat(),
                "capabilities": agent.get_capabilities()
            }
        return None

    def get_all_agent_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all agents"""
        return {
            agent_id: self.get_agent_status(agent_id)
            for agent_id in self.agents
        }
