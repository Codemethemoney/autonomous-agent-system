from typing import Dict, Any
import openai
from ..core.model_agent import ModelAgent

class CodeAnalyzerAgent(ModelAgent):
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        config["required_capabilities"] = ["code_review", "debugging"]
        super().__init__(agent_id, config)

    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        try:
            self.logger.info(f"Processing code analysis task: {task.get('id')}")
            
            # Extract code from task
            code = task.get("code", "")
            context = task.get("context", {})
            
            async def model_operation(model: str) -> Dict[str, Any]:
                # Prepare analysis prompt
                prompt = self._prepare_analysis_prompt(code, context)
                
                # Get analysis from the model
                response = await openai.ChatCompletion.acreate(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a code analysis expert. Analyze the following code for bugs, potential improvements, and optimization opportunities."},
                        {"role": "user", "content": prompt}
                    ]
                )
                
                # Process and structure the analysis
                return self._process_analysis(response.choices[0].message.content)
            
            # Execute with automatic model management
            analysis = await self.execute_with_model(model_operation)
            
            self.logger.info(f"Code analysis completed for task: {task.get('id')}")
            return {
                "task_id": task.get("id"),
                "status": "completed",
                "analysis": analysis
            }
            
        except Exception as e:
            self.logger.error(f"Error in code analysis: {str(e)}")
            await self.handle_error(e, task)
            return {
                "task_id": task.get("id"),
                "status": "failed",
                "error": str(e)
            }

    async def handle_error(self, error: Exception, task: Dict[str, Any]) -> None:
        self.logger.error(f"Error processing task {task.get('id')}: {str(error)}")
        await self.update_status("error")
        # Implement error recovery logic here

    def _prepare_analysis_prompt(self, code: str, context: Dict[str, Any]) -> str:
        return f"""
        Please analyze the following code:
        
        ```
        {code}
        ```
        
        Context:
        - Language: {context.get('language', 'Unknown')}
        - Framework: {context.get('framework', 'Unknown')}
        - Purpose: {context.get('purpose', 'Unknown')}
        
        Please provide:
        1. Potential bugs or issues
        2. Code quality assessment
        3. Performance optimization suggestions
        4. Security considerations
        5. Best practices recommendations
        """

    def _process_analysis(self, raw_analysis: str) -> Dict[str, Any]:
        # Structure the raw analysis into categories
        return {
            "bugs": self._extract_category(raw_analysis, "bugs"),
            "quality": self._extract_category(raw_analysis, "quality"),
            "performance": self._extract_category(raw_analysis, "performance"),
            "security": self._extract_category(raw_analysis, "security"),
            "recommendations": self._extract_category(raw_analysis, "recommendations")
        }

    def _extract_category(self, analysis: str, category: str) -> List[str]:
        # Implement logic to extract specific categories from the analysis
        # This is a placeholder - implement actual extraction logic
        return []
