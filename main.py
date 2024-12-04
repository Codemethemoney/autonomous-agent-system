import asyncio
import json
from agents.manager.agent_manager import AgentManager
import logging
from typing import Dict, Any

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/main.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def main():
    try:
        # Initialize agent manager
        manager = AgentManager()
        
        # Start the manager
        await manager.start()
        
        # Example task: Code analysis
        code_analysis_task = {
            "type": "code_analysis",
            "code": """
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total
            """,
            "context": {
                "language": "python",
                "framework": "none",
                "purpose": "Calculate sum of numbers"
            }
        }
        
        # Submit task using the code development workflow
        task_id = await manager.submit_task(code_analysis_task, workflow="code_development")
        logger.info(f"Submitted task: {task_id}")
        
        # Keep the program running
        while True:
            # Print agent status every minute
            statuses = manager.get_all_agent_status()
            logger.info("Current agent statuses:")
            for agent_id, status in statuses.items():
                logger.info(f"{agent_id}: {status['status']}")
            
            await asyncio.sleep(60)
            
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        await manager.stop()
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        await manager.stop()

if __name__ == "__main__":
    asyncio.run(main())
