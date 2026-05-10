/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  'mutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n  }\n}': typeof types.SignUpDocument;
  'query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}': typeof types.ChatProvidersDocument;
  'mutation RunCouncil($params: JSON!) {\n  runCouncil(params: $params)\n}': typeof types.RunCouncilDocument;
  'query SystemHealth($params: JSON) {\n  systemHealth(params: $params)\n}\n\nquery SystemReady($params: JSON) {\n  systemReady(params: $params)\n}\n\nquery MetricsSummary($params: JSON) {\n  metricsSummary(params: $params)\n}': typeof types.SystemHealthDocument;
  'mutation TextToImage($params: JSON!) {\n  textToImage(params: $params)\n}': typeof types.TextToImageDocument;
  'query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}': typeof types.RagListDocument;
  'query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}': typeof types.StorageBucketsDocument;
  'mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}': typeof types.AnalyzeImageDocument;
};
const documents: Documents = {
  'mutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n  }\n}':
    types.SignUpDocument,
  'query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}':
    types.ChatProvidersDocument,
  'mutation RunCouncil($params: JSON!) {\n  runCouncil(params: $params)\n}':
    types.RunCouncilDocument,
  'query SystemHealth($params: JSON) {\n  systemHealth(params: $params)\n}\n\nquery SystemReady($params: JSON) {\n  systemReady(params: $params)\n}\n\nquery MetricsSummary($params: JSON) {\n  metricsSummary(params: $params)\n}':
    types.SystemHealthDocument,
  'mutation TextToImage($params: JSON!) {\n  textToImage(params: $params)\n}':
    types.TextToImageDocument,
  'query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}':
    types.RagListDocument,
  'query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}':
    types.StorageBucketsDocument,
  'mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}':
    types.AnalyzeImageDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'mutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n  }\n}'
): (typeof documents)['mutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n  }\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}'
): (typeof documents)['query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'mutation RunCouncil($params: JSON!) {\n  runCouncil(params: $params)\n}'
): (typeof documents)['mutation RunCouncil($params: JSON!) {\n  runCouncil(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query SystemHealth($params: JSON) {\n  systemHealth(params: $params)\n}\n\nquery SystemReady($params: JSON) {\n  systemReady(params: $params)\n}\n\nquery MetricsSummary($params: JSON) {\n  metricsSummary(params: $params)\n}'
): (typeof documents)['query SystemHealth($params: JSON) {\n  systemHealth(params: $params)\n}\n\nquery SystemReady($params: JSON) {\n  systemReady(params: $params)\n}\n\nquery MetricsSummary($params: JSON) {\n  metricsSummary(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'mutation TextToImage($params: JSON!) {\n  textToImage(params: $params)\n}'
): (typeof documents)['mutation TextToImage($params: JSON!) {\n  textToImage(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}'
): (typeof documents)['query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}'
): (typeof documents)['query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}'
): (typeof documents)['mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}'];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
