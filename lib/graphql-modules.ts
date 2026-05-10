/**
 * GraphQL operations for modular backend APIs (same shapes as graphql/documents/*.graphql).
 * Run `npm run codegen` to regenerate typed hooks under graphql/generated/.
 */
import { gql } from '@apollo/client';

export const SYSTEM_HEALTH = gql`
  query SystemHealth($params: JSON) {
    systemHealth(params: $params)
  }
`;

export const SYSTEM_READY = gql`
  query SystemReady($params: JSON) {
    systemReady(params: $params)
  }
`;

export const METRICS_SUMMARY = gql`
  query MetricsSummary($params: JSON) {
    metricsSummary(params: $params)
  }
`;

export const CHAT_PROVIDERS = gql`
  query ChatProviders {
    chatProviders
  }
`;

export const CHAT_CONVERSATIONS = gql`
  query ChatConversations($limit: Int) {
    chatConversations(limit: $limit)
  }
`;

export const CHAT_COMPLETION = gql`
  mutation ChatCompletion($params: JSON!) {
    chatCompletion(params: $params)
  }
`;

export const RAG_LIST = gql`
  query RagList($collectionName: String, $limit: Int, $offset: Int) {
    ragList(collectionName: $collectionName, limit: $limit, offset: $offset)
  }
`;

export const STORAGE_BUCKETS = gql`
  query StorageBuckets($params: JSON) {
    storageBuckets(params: $params)
  }
`;

export const ANALYZE_IMAGE = gql`
  mutation AnalyzeImage($params: JSON!) {
    analyzeImage(params: $params)
  }
`;

export const TEXT_TO_IMAGE = gql`
  mutation TextToImage($params: JSON!) {
    textToImage(params: $params)
  }
`;

export const RUN_COUNCIL = gql`
  mutation RunCouncil($params: JSON!) {
    runCouncil(params: $params)
  }
`;
