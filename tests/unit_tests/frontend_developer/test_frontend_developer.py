import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, patch
from agents.frontend_developer.main import FrontendDeveloper

class TestFrontendDeveloper:
    @pytest.fixture
    def agent(self):
        return FrontendDeveloper()

    @pytest.mark.asyncio
    async def test_create_component(self, agent):
        component_spec = {
            'name': 'TestButton',
            'type': 'functional',
            'props': {
                'onClick': 'Function',
                'label': 'string',
                'disabled': 'boolean'
            }
        }
        
        result = await agent.create_component(component_spec)
        
        assert result['status'] == 'success'
        assert 'component_id' in result
        assert 'code' in result