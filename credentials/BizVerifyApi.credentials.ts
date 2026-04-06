import type {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class BizVerifyApi implements ICredentialType {
  name = 'bizVerifyApi';
  displayName = 'BizVerify API';
  documentationUrl = 'https://docs.bizverify.co/guides/ai-agents#n8n';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your BizVerify API key (starts with bv_)',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.bizverify.co',
      description: 'BizVerify API base URL',
    },
  ];
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'X-API-Key': '={{$credentials.apiKey}}',
      },
    },
  };
}
