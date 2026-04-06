import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
} from 'n8n-workflow';

export class BizVerify implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'BizVerify',
    name: 'bizVerify',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Verify business entities against official government registries',
    defaults: {
      name: 'BizVerify',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'bizVerifyApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Verify Business', value: 'verifyBusiness', description: 'Verify a business entity in a jurisdiction' },
          { name: 'Search Entities', value: 'searchEntities', description: 'Search for business entities by name' },
          { name: 'Check Job Status', value: 'checkJobStatus', description: 'Check the status of an async verification job' },
          { name: 'Get Entity', value: 'getEntity', description: 'Get cached entity details' },
          { name: 'Get Entity History', value: 'getEntityHistory', description: 'Get verification history for an entity' },
          { name: 'Get Account', value: 'getAccount', description: 'View account info and credit balance' },
          { name: 'Get Config', value: 'getConfig', description: 'Get service configuration' },
          { name: 'List Jurisdictions', value: 'listJurisdictions', description: 'List supported jurisdictions' },
          { name: 'Purchase Credits', value: 'purchaseCredits', description: 'Purchase additional credits' },
        ],
        default: 'verifyBusiness',
      },

      // Verify Business fields
      {
        displayName: 'Entity Name',
        name: 'entityName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['verifyBusiness'] } },
        description: 'Business entity name to verify',
      },
      {
        displayName: 'Jurisdiction',
        name: 'jurisdiction',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['verifyBusiness'] } },
        description: 'Jurisdiction code (e.g., us-fl, us-de, gb)',
      },
      {
        displayName: 'Verification Level',
        name: 'level',
        type: 'options',
        options: [
          { name: 'Full', value: 'full' },
          { name: 'Pre-Check', value: 'pre_check' },
        ],
        default: 'full',
        displayOptions: { show: { operation: ['verifyBusiness'] } },
      },
      {
        displayName: 'Force Refresh',
        name: 'forceRefresh',
        type: 'boolean',
        default: false,
        displayOptions: { show: { operation: ['verifyBusiness'] } },
        description: 'Whether to force fresh data from government registry',
      },

      // Search Entities fields
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['searchEntities'] } },
        description: 'Business name search query',
      },
      {
        displayName: 'Search Jurisdiction',
        name: 'searchJurisdiction',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['searchEntities'] } },
        description: 'Jurisdiction code to search in (optional — searches all active if empty)',
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 10,
        displayOptions: { show: { operation: ['searchEntities', 'getEntityHistory'] } },
        description: 'Maximum number of results to return',
      },

      // Job ID field
      {
        displayName: 'Job ID',
        name: 'jobId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['checkJobStatus'] } },
        description: 'Job ID from a previous verification request',
      },

      // Entity ID field
      {
        displayName: 'Entity ID',
        name: 'entityId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['getEntity', 'getEntityHistory'] } },
        description: 'Entity ID from verify or search results',
      },

      // Package ID field
      {
        displayName: 'Package ID',
        name: 'packageId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['purchaseCredits'] } },
        description: 'Package ID from get_config pricing section',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;
    const credentials = await this.getCredentials('bizVerifyApi');
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

    for (let i = 0; i < items.length; i++) {
      let response: unknown;

      if (operation === 'verifyBusiness') {
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'POST',
          url: `${baseUrl}/v1/verify`,
          json: true,
          body: {
            entity_name: this.getNodeParameter('entityName', i) as string,
            jurisdiction: this.getNodeParameter('jurisdiction', i) as string,
            verification_level: this.getNodeParameter('level', i) as string,
            force_refresh: this.getNodeParameter('forceRefresh', i) as boolean,
          },
        });
      } else if (operation === 'searchEntities') {
        const body: Record<string, unknown> = {
          entity_name: this.getNodeParameter('query', i) as string,
          limit: this.getNodeParameter('limit', i) as number,
        };
        const jurisdiction = this.getNodeParameter('searchJurisdiction', i) as string;
        if (jurisdiction) body.jurisdiction = jurisdiction;

        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'POST',
          url: `${baseUrl}/v1/search`,
          json: true,
          body,
        });
      } else if (operation === 'checkJobStatus') {
        const jobId = this.getNodeParameter('jobId', i) as string;
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'GET',
          url: `${baseUrl}/v1/verify/status/${jobId}`,
          json: true,
        });
      } else if (operation === 'getEntity') {
        const entityId = this.getNodeParameter('entityId', i) as string;
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'GET',
          url: `${baseUrl}/v1/entity/${entityId}`,
          json: true,
        });
      } else if (operation === 'getEntityHistory') {
        const entityId = this.getNodeParameter('entityId', i) as string;
        const limit = this.getNodeParameter('limit', i) as number;
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'GET',
          url: `${baseUrl}/v1/entity/${entityId}/history?limit=${limit}`,
          json: true,
        });
      } else if (operation === 'getAccount') {
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'GET',
          url: `${baseUrl}/v1/account`,
          json: true,
        });
      } else if (operation === 'getConfig') {
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'GET',
          url: `${baseUrl}/v1/config`,
          json: true,
        });
      } else if (operation === 'listJurisdictions') {
        const config = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'GET',
          url: `${baseUrl}/v1/config`,
          json: true,
        }) as Record<string, unknown>;
        response = config['jurisdictions'];
      } else if (operation === 'purchaseCredits') {
        response = await this.helpers.httpRequestWithAuthentication.call(this, 'bizVerifyApi', {
          method: 'POST',
          url: `${baseUrl}/v1/billing/purchase`,
          json: true,
          body: {
            package_id: this.getNodeParameter('packageId', i) as string,
          },
        });
      }

      returnData.push({ json: response as IDataObject });
    }

    return [returnData];
  }
}
