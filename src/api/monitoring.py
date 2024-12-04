
from fastapi import APIRouter, status
from typing import List
from pydantic import BaseModel
from src.core.agents.manager import AgentManager
from src.core.errors.manager import ErrorManager

monitoring_router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

class AgentStatus(BaseModel):
    agent_id: str
    status: str
    last_heartbeat: str

class AgentMetrics(BaseModel):
    agent_id: str
    cpu_utilization: float
    memory_usage: float
    queue_length: int
    processing_time: float

class ErrorDetails(BaseModel):
    error_id: str
    error_type: str
    message: str
    timestamp: str
    affected_agents: List[str]
    severity: str

@monitoring_router.get("/agents/status", response_model=List[AgentStatus])
def get_agent_status():
    """
    Retrieve the current status of all agents.
    """
    agent_manager = AgentManager()
    return [
        AgentStatus(
            agent_id=agent.agent_id,
            status=agent.status,
            last_heartbeat=agent.last_heartbeat.isoformat()
        )
        for agent in agent_manager.get_all_agents()
    ]

@monitoring_router.get("/agents/{agent_id}/metrics", response_model=AgentMetrics)
def get_agent_metrics(agent_id: str):
    """
    Retrieve detailed performance metrics for a specific agent.
    """
    agent_manager = AgentManager()
    agent = agent_manager.get_agent(agent_id)
    return AgentMetrics(
        agent_id=agent.agent_id,
        cpu_utilization=agent.cpu_utilization,
        memory_usage=agent.memory_usage,
        queue_length=agent.task_queue_length,
        processing_time=agent.avg_processing_time
    )

@monitoring_router.get("/errors", response_model=List[ErrorDetails])
def get_all_errors():
    """
    Retrieve a list of all errors that have occurred in the system.
    """
    error_manager = ErrorManager()
    errors = error_manager.get_all_errors()
    return [
        ErrorDetails(
            error_id=error.error_id,
            error_type=error.error_type,
            message=error.message,
            timestamp=error.timestamp.isoformat(),
            affected_agents=error.affected_agents,
            severity=error.severity
        )
        for error in errors
    ]
