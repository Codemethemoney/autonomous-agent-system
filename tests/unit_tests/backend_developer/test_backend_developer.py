import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, patch
from agents.backend_developer.main import BackendDeveloper

class TestBackendDeveloper:
    @pytest.fixture
    def agent(self):
        return BackendDeveloper()

    @pytest.mark.asyncio
    async def test_create_api_endpoint(self, agent):
        endpoint_spec = {
            'path': '/api/test',
            'method': 'GET',
            'response_schema': {
                'name': 'TestResponse',
                'fields': {
                    'message': {'type': 'str'}
                }
            }
        }
        
        result = await agent.create_api_endpoint(endpoint_spec)
        
        assert result['status'] == 'success'
        assert 'endpoint_id' in result
        assert 'code' in result