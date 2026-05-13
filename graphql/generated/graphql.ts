/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type EmailRegisteredQueryVariables = Exact<{
  email: string;
}>;

export type EmailRegisteredQuery = { emailRegistered: boolean };

export type SignUpMutationVariables = Exact<{
  email: string;
  password: string;
  metadata?: unknown;
}>;

export type SignUpMutation = {
  signUp: {
    success: boolean;
    requiresConfirmation: boolean;
    user: { id: string; email: string | null } | null;
    session: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      expiresAt: number | null;
      tokenType: string;
    } | null;
  };
};

export type SignInMutationVariables = Exact<{
  email: string;
  password: string;
}>;

export type SignInMutation = {
  signIn: {
    success: boolean;
    requiresConfirmation: boolean;
    user: { id: string; email: string | null } | null;
    session: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      expiresAt: number | null;
      tokenType: string;
    } | null;
  };
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = { me: { id: string; email: string | null } | null };

export type ChatProvidersQueryVariables = Exact<{ [key: string]: never }>;

export type ChatProvidersQuery = { chatProviders: unknown };

export type ChatConversationsQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;

export type ChatConversationsQuery = { chatConversations: unknown };

export type ChatCompletionMutationVariables = Exact<{
  params: unknown;
}>;

export type ChatCompletionMutation = { chatCompletion: unknown };

export type DeleteConversationMutationVariables = Exact<{
  conversationId: string;
}>;

export type DeleteConversationMutation = { deleteConversation: unknown };

export type RunCouncilMutationVariables = Exact<{
  params: unknown;
}>;

export type RunCouncilMutation = { runCouncil: unknown };

export type SystemHealthQueryVariables = Exact<{
  params?: unknown;
}>;

export type SystemHealthQuery = { systemHealth: unknown };

export type SystemReadyQueryVariables = Exact<{
  params?: unknown;
}>;

export type SystemReadyQuery = { systemReady: unknown };

export type MetricsSummaryQueryVariables = Exact<{
  params?: unknown;
}>;

export type MetricsSummaryQuery = { metricsSummary: unknown };

export type TextToImageMutationVariables = Exact<{
  params: unknown;
}>;

export type TextToImageMutation = { textToImage: unknown };

export type RagListQueryVariables = Exact<{
  collectionName?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;

export type RagListQuery = { ragList: unknown };

export type RagQueryQueryVariables = Exact<{
  query: string;
  k?: number | null | undefined;
  collectionName?: string | null | undefined;
}>;

export type RagQueryQuery = { ragQuery: unknown };

export type RagIngestMutationVariables = Exact<{
  params: unknown;
}>;

export type RagIngestMutation = { ragIngest: unknown };

export type StorageBucketsQueryVariables = Exact<{
  params?: unknown;
}>;

export type StorageBucketsQuery = { storageBuckets: unknown };

export type StorageListQueryVariables = Exact<{
  params?: unknown;
}>;

export type StorageListQuery = { storageList: unknown };

export type StorageUploadMutationVariables = Exact<{
  params: unknown;
}>;

export type StorageUploadMutation = { storageUpload: unknown };

export type AnalyzeImageMutationVariables = Exact<{
  params: unknown;
}>;

export type AnalyzeImageMutation = { analyzeImage: unknown };

export type WeatherForecastQueryVariables = Exact<{
  params?: unknown;
}>;

export type WeatherForecastQuery = { weatherForecast: unknown };

export const EmailRegisteredDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'EmailRegistered' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'emailRegistered' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EmailRegisteredQuery, EmailRegisteredQueryVariables>;
export const SignUpDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SignUp' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'password' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'metadata' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'signUp' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'password' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'password' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'metadata' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'metadata' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'requiresConfirmation' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'session' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'refreshToken' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresIn' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tokenType' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SignUpMutation, SignUpMutationVariables>;
export const SignInDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SignIn' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'password' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'signIn' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'email' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'email' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'password' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'password' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'requiresConfirmation' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'session' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'refreshToken' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresIn' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'tokenType' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SignInMutation, SignInMutationVariables>;
export const MeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Me' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'me' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const ChatProvidersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ChatProviders' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [{ kind: 'Field', name: { kind: 'Name', value: 'chatProviders' } }],
      },
    },
  ],
} as unknown as DocumentNode<ChatProvidersQuery, ChatProvidersQueryVariables>;
export const ChatConversationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ChatConversations' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'chatConversations' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ChatConversationsQuery, ChatConversationsQueryVariables>;
export const ChatCompletionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ChatCompletion' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'chatCompletion' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ChatCompletionMutation, ChatCompletionMutationVariables>;
export const DeleteConversationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteConversation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'conversationId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteConversation' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'conversationId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'conversationId' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteConversationMutation, DeleteConversationMutationVariables>;
export const RunCouncilDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RunCouncil' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'runCouncil' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RunCouncilMutation, RunCouncilMutationVariables>;
export const SystemHealthDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SystemHealth' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'systemHealth' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SystemHealthQuery, SystemHealthQueryVariables>;
export const SystemReadyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'SystemReady' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'systemReady' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SystemReadyQuery, SystemReadyQueryVariables>;
export const MetricsSummaryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MetricsSummary' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'metricsSummary' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MetricsSummaryQuery, MetricsSummaryQueryVariables>;
export const TextToImageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'TextToImage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'textToImage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TextToImageMutation, TextToImageMutationVariables>;
export const RagListDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'RagList' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'collectionName' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'ragList' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'collectionName' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'collectionName' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'offset' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'offset' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RagListQuery, RagListQueryVariables>;
export const RagQueryDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'RagQuery' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'query' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'k' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'collectionName' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'ragQuery' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'query' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'query' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'k' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'k' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'collectionName' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'collectionName' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RagQueryQuery, RagQueryQueryVariables>;
export const RagIngestDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RagIngest' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'ragIngest' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RagIngestMutation, RagIngestMutationVariables>;
export const StorageBucketsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StorageBuckets' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'storageBuckets' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StorageBucketsQuery, StorageBucketsQueryVariables>;
export const StorageListDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StorageList' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'storageList' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StorageListQuery, StorageListQueryVariables>;
export const StorageUploadDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'StorageUpload' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'storageUpload' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StorageUploadMutation, StorageUploadMutationVariables>;
export const AnalyzeImageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AnalyzeImage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'analyzeImage' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AnalyzeImageMutation, AnalyzeImageMutationVariables>;
export const WeatherForecastDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'WeatherForecast' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'JSON' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'weatherForecast' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'params' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'params' } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<WeatherForecastQuery, WeatherForecastQueryVariables>;
