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
  'query ListAgents {\n  listAgents\n}\n\nmutation AnalyzeAgent($agentType: String!, $pageData: JSON!, $query: String, $options: JSON) {\n  analyzeAgent(\n    agentType: $agentType\n    pageData: $pageData\n    query: $query\n    options: $options\n  )\n}\n\nmutation AutoAnalyze($pageData: JSON!, $query: String!) {\n  autoAnalyze(pageData: $pageData, query: $query)\n}\n\nmutation AgentsQuickSeo($params: JSON!) {\n  agentsQuickSeo(params: $params)\n}\n\nmutation AgentsSummarize($params: JSON!) {\n  agentsSummarize(params: $params)\n}': typeof types.ListAgentsDocument;
  'query EmailRegistered($email: String!) {\n  emailRegistered(email: $email)\n}\n\nmutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n    userMetadata\n    appMetadata\n    createdAt\n    updatedAt\n    isActive\n    isVerified\n    profile {\n      username\n      avatarUrl\n      bio\n      preferences\n      createdAt\n      updatedAt\n    }\n  }\n}': typeof types.EmailRegisteredDocument;
  'query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nquery ChatConversation($conversationId: String!) {\n  chatConversation(conversationId: $conversationId)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}': typeof types.ChatProvidersDocument;
  'mutation RunCouncil($params: JSON!) {\n  runCouncil(params: $params)\n}': typeof types.RunCouncilDocument;
  'query GmailListMessages($params: JSON) {\n  gmailListMessages(params: $params)\n}\n\nquery GmailGetMessage($params: JSON) {\n  gmailGetMessage(params: $params)\n}\n\nquery GmailListThreads($params: JSON) {\n  gmailListThreads(params: $params)\n}\n\nquery GmailGetThread($params: JSON) {\n  gmailGetThread(params: $params)\n}': typeof types.GmailListMessagesDocument;
  'query GoogleCalendarListEvents($params: JSON) {\n  googleCalendarListEvents(params: $params)\n}': typeof types.GoogleCalendarListEventsDocument;
  'query GoogleDriveListFiles($params: JSON) {\n  googleDriveListFiles(params: $params)\n}': typeof types.GoogleDriveListFilesDocument;
  'query GooglePeopleListContacts($params: JSON) {\n  googlePeopleListContacts(params: $params)\n}': typeof types.GooglePeopleListContactsDocument;
  'query GooglePhotosList($params: JSON) {\n  googlePhotosList(params: $params)\n}': typeof types.GooglePhotosListDocument;
  'query GoogleTasksListTasklists($params: JSON) {\n  googleTasksListTasklists(params: $params)\n}\n\nquery GoogleTasksEnsureKanbanLists($params: JSON) {\n  googleTasksEnsureKanbanLists(params: $params)\n}\n\nquery GoogleTasksListTasks($params: JSON) {\n  googleTasksListTasks(params: $params)\n}\n\nmutation GoogleTasksInsertTask($params: JSON) {\n  googleTasksInsertTask(params: $params)\n}\n\nmutation GoogleTasksUpdateTask($params: JSON) {\n  googleTasksUpdateTask(params: $params)\n}\n\nmutation GoogleTasksDeleteTask($params: JSON) {\n  googleTasksDeleteTask(params: $params)\n}\n\nmutation GoogleTasksMoveTask($params: JSON) {\n  googleTasksMoveTask(params: $params)\n}': typeof types.GoogleTasksListTasklistsDocument;
  'query SystemHealth($params: JSON) {\n  systemHealth(params: $params)\n}\n\nquery SystemReady($params: JSON) {\n  systemReady(params: $params)\n}\n\nquery MetricsSummary($params: JSON) {\n  metricsSummary(params: $params)\n}': typeof types.SystemHealthDocument;
  'query InstalledApps {\n  installedApps {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveInstalledApps($appIds: [String!]!) {\n  saveInstalledApps(appIds: $appIds) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveFileAssociations($associations: JSON!) {\n  saveFileAssociations(associations: $associations) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}': typeof types.InstalledAppsDocument;
  'query LinkedGoogleAccounts {\n  linkedGoogleAccounts\n}\n\nquery GetLinkedGoogleAccountToken($googleUserId: String!) {\n  getLinkedGoogleAccountToken(googleUserId: $googleUserId)\n}\n\nmutation AddLinkedGoogleAccount($params: JSON!) {\n  addLinkedGoogleAccount(params: $params)\n}\n\nmutation RemoveLinkedGoogleAccount($googleUserId: String!) {\n  removeLinkedGoogleAccount(googleUserId: $googleUserId)\n}\n\nmutation RefreshLinkedGoogleAccountToken($googleUserId: String!, $accessToken: String!, $expiresAt: Float!, $scopesGranted: String) {\n  refreshLinkedGoogleAccountToken(\n    googleUserId: $googleUserId\n    accessToken: $accessToken\n    expiresAt: $expiresAt\n    scopesGranted: $scopesGranted\n  )\n}': typeof types.LinkedGoogleAccountsDocument;
  'mutation TextToImage($params: JSON!) {\n  textToImage(params: $params)\n}': typeof types.TextToImageDocument;
  'query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagDocuments($collectionName: String, $limit: Int, $offset: Int) {\n  ragDocuments(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nquery RagStats($collectionName: String) {\n  ragStats(collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}\n\nmutation RagDelete($documentId: String!) {\n  ragDelete(documentId: $documentId)\n}\n\nmutation RagUpload($params: JSON!) {\n  ragUpload(params: $params)\n}': typeof types.RagListDocument;
  'query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}\n\nmutation StorageGetUrl($params: JSON!) {\n  storageGetUrl(params: $params)\n}\n\nmutation StorageDelete($params: JSON!) {\n  storageDelete(params: $params)\n}\n\nmutation StorageMove($params: JSON!) {\n  storageMove(params: $params)\n}\n\nmutation StorageMkdir($params: JSON!) {\n  storageMkdir(params: $params)\n}': typeof types.StorageBucketsDocument;
  'query TodoTasks($workspaceId: String!) {\n  todoTasks(workspaceId: $workspaceId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoTask($workspaceId: String!, $column: String!, $title: String!) {\n  createTodoTask(workspaceId: $workspaceId, column: $column, title: $title) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation MoveTodoTask($taskId: String!, $column: String!, $previousTaskId: String) {\n  moveTodoTask(taskId: $taskId, column: $column, previousTaskId: $previousTaskId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoTask($taskId: String!) {\n  deleteTodoTask(taskId: $taskId)\n}': typeof types.TodoTasksDocument;
  'query TodoWorkspaces($googleUserId: String!) {\n  todoWorkspaces(googleUserId: $googleUserId) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoWorkspace($googleUserId: String!, $name: String!, $params: JSON) {\n  createTodoWorkspace(googleUserId: $googleUserId, name: $name, params: $params) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation RenameTodoWorkspace($workspaceId: String!, $name: String!) {\n  renameTodoWorkspace(workspaceId: $workspaceId, name: $name) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoWorkspace($workspaceId: String!) {\n  deleteTodoWorkspace(workspaceId: $workspaceId)\n}': typeof types.TodoWorkspacesDocument;
  'mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}': typeof types.AnalyzeImageDocument;
  'query WeatherForecast($params: JSON) {\n  weatherForecast(params: $params)\n}': typeof types.WeatherForecastDocument;
  'query WorkflowDefinitions {\n  workflowDefinitions {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nquery WorkflowRuns($workflowId: String) {\n  workflowRuns(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateWorkflowDefinition($name: String!, $spec: JSON!) {\n  createWorkflowDefinition(name: $name, spec: $spec) {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nmutation StartWorkflowRun($workflowId: String!) {\n  startWorkflowRun(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}': typeof types.WorkflowDefinitionsDocument;
};
const documents: Documents = {
  'query ListAgents {\n  listAgents\n}\n\nmutation AnalyzeAgent($agentType: String!, $pageData: JSON!, $query: String, $options: JSON) {\n  analyzeAgent(\n    agentType: $agentType\n    pageData: $pageData\n    query: $query\n    options: $options\n  )\n}\n\nmutation AutoAnalyze($pageData: JSON!, $query: String!) {\n  autoAnalyze(pageData: $pageData, query: $query)\n}\n\nmutation AgentsQuickSeo($params: JSON!) {\n  agentsQuickSeo(params: $params)\n}\n\nmutation AgentsSummarize($params: JSON!) {\n  agentsSummarize(params: $params)\n}':
    types.ListAgentsDocument,
  'query EmailRegistered($email: String!) {\n  emailRegistered(email: $email)\n}\n\nmutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n    userMetadata\n    appMetadata\n    createdAt\n    updatedAt\n    isActive\n    isVerified\n    profile {\n      username\n      avatarUrl\n      bio\n      preferences\n      createdAt\n      updatedAt\n    }\n  }\n}':
    types.EmailRegisteredDocument,
  'query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nquery ChatConversation($conversationId: String!) {\n  chatConversation(conversationId: $conversationId)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}':
    types.ChatProvidersDocument,
  'mutation RunCouncil($params: JSON!) {\n  runCouncil(params: $params)\n}':
    types.RunCouncilDocument,
  'query GmailListMessages($params: JSON) {\n  gmailListMessages(params: $params)\n}\n\nquery GmailGetMessage($params: JSON) {\n  gmailGetMessage(params: $params)\n}\n\nquery GmailListThreads($params: JSON) {\n  gmailListThreads(params: $params)\n}\n\nquery GmailGetThread($params: JSON) {\n  gmailGetThread(params: $params)\n}':
    types.GmailListMessagesDocument,
  'query GoogleCalendarListEvents($params: JSON) {\n  googleCalendarListEvents(params: $params)\n}':
    types.GoogleCalendarListEventsDocument,
  'query GoogleDriveListFiles($params: JSON) {\n  googleDriveListFiles(params: $params)\n}':
    types.GoogleDriveListFilesDocument,
  'query GooglePeopleListContacts($params: JSON) {\n  googlePeopleListContacts(params: $params)\n}':
    types.GooglePeopleListContactsDocument,
  'query GooglePhotosList($params: JSON) {\n  googlePhotosList(params: $params)\n}':
    types.GooglePhotosListDocument,
  'query GoogleTasksListTasklists($params: JSON) {\n  googleTasksListTasklists(params: $params)\n}\n\nquery GoogleTasksEnsureKanbanLists($params: JSON) {\n  googleTasksEnsureKanbanLists(params: $params)\n}\n\nquery GoogleTasksListTasks($params: JSON) {\n  googleTasksListTasks(params: $params)\n}\n\nmutation GoogleTasksInsertTask($params: JSON) {\n  googleTasksInsertTask(params: $params)\n}\n\nmutation GoogleTasksUpdateTask($params: JSON) {\n  googleTasksUpdateTask(params: $params)\n}\n\nmutation GoogleTasksDeleteTask($params: JSON) {\n  googleTasksDeleteTask(params: $params)\n}\n\nmutation GoogleTasksMoveTask($params: JSON) {\n  googleTasksMoveTask(params: $params)\n}':
    types.GoogleTasksListTasklistsDocument,
  'query SystemHealth($params: JSON) {\n  systemHealth(params: $params)\n}\n\nquery SystemReady($params: JSON) {\n  systemReady(params: $params)\n}\n\nquery MetricsSummary($params: JSON) {\n  metricsSummary(params: $params)\n}':
    types.SystemHealthDocument,
  'query InstalledApps {\n  installedApps {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveInstalledApps($appIds: [String!]!) {\n  saveInstalledApps(appIds: $appIds) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveFileAssociations($associations: JSON!) {\n  saveFileAssociations(associations: $associations) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}':
    types.InstalledAppsDocument,
  'query LinkedGoogleAccounts {\n  linkedGoogleAccounts\n}\n\nquery GetLinkedGoogleAccountToken($googleUserId: String!) {\n  getLinkedGoogleAccountToken(googleUserId: $googleUserId)\n}\n\nmutation AddLinkedGoogleAccount($params: JSON!) {\n  addLinkedGoogleAccount(params: $params)\n}\n\nmutation RemoveLinkedGoogleAccount($googleUserId: String!) {\n  removeLinkedGoogleAccount(googleUserId: $googleUserId)\n}\n\nmutation RefreshLinkedGoogleAccountToken($googleUserId: String!, $accessToken: String!, $expiresAt: Float!, $scopesGranted: String) {\n  refreshLinkedGoogleAccountToken(\n    googleUserId: $googleUserId\n    accessToken: $accessToken\n    expiresAt: $expiresAt\n    scopesGranted: $scopesGranted\n  )\n}':
    types.LinkedGoogleAccountsDocument,
  'mutation TextToImage($params: JSON!) {\n  textToImage(params: $params)\n}':
    types.TextToImageDocument,
  'query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagDocuments($collectionName: String, $limit: Int, $offset: Int) {\n  ragDocuments(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nquery RagStats($collectionName: String) {\n  ragStats(collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}\n\nmutation RagDelete($documentId: String!) {\n  ragDelete(documentId: $documentId)\n}\n\nmutation RagUpload($params: JSON!) {\n  ragUpload(params: $params)\n}':
    types.RagListDocument,
  'query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}\n\nmutation StorageGetUrl($params: JSON!) {\n  storageGetUrl(params: $params)\n}\n\nmutation StorageDelete($params: JSON!) {\n  storageDelete(params: $params)\n}\n\nmutation StorageMove($params: JSON!) {\n  storageMove(params: $params)\n}\n\nmutation StorageMkdir($params: JSON!) {\n  storageMkdir(params: $params)\n}':
    types.StorageBucketsDocument,
  'query TodoTasks($workspaceId: String!) {\n  todoTasks(workspaceId: $workspaceId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoTask($workspaceId: String!, $column: String!, $title: String!) {\n  createTodoTask(workspaceId: $workspaceId, column: $column, title: $title) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation MoveTodoTask($taskId: String!, $column: String!, $previousTaskId: String) {\n  moveTodoTask(taskId: $taskId, column: $column, previousTaskId: $previousTaskId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoTask($taskId: String!) {\n  deleteTodoTask(taskId: $taskId)\n}':
    types.TodoTasksDocument,
  'query TodoWorkspaces($googleUserId: String!) {\n  todoWorkspaces(googleUserId: $googleUserId) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoWorkspace($googleUserId: String!, $name: String!, $params: JSON) {\n  createTodoWorkspace(googleUserId: $googleUserId, name: $name, params: $params) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation RenameTodoWorkspace($workspaceId: String!, $name: String!) {\n  renameTodoWorkspace(workspaceId: $workspaceId, name: $name) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoWorkspace($workspaceId: String!) {\n  deleteTodoWorkspace(workspaceId: $workspaceId)\n}':
    types.TodoWorkspacesDocument,
  'mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}':
    types.AnalyzeImageDocument,
  'query WeatherForecast($params: JSON) {\n  weatherForecast(params: $params)\n}':
    types.WeatherForecastDocument,
  'query WorkflowDefinitions {\n  workflowDefinitions {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nquery WorkflowRuns($workflowId: String) {\n  workflowRuns(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateWorkflowDefinition($name: String!, $spec: JSON!) {\n  createWorkflowDefinition(name: $name, spec: $spec) {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nmutation StartWorkflowRun($workflowId: String!) {\n  startWorkflowRun(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}':
    types.WorkflowDefinitionsDocument,
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
  source: 'query ListAgents {\n  listAgents\n}\n\nmutation AnalyzeAgent($agentType: String!, $pageData: JSON!, $query: String, $options: JSON) {\n  analyzeAgent(\n    agentType: $agentType\n    pageData: $pageData\n    query: $query\n    options: $options\n  )\n}\n\nmutation AutoAnalyze($pageData: JSON!, $query: String!) {\n  autoAnalyze(pageData: $pageData, query: $query)\n}\n\nmutation AgentsQuickSeo($params: JSON!) {\n  agentsQuickSeo(params: $params)\n}\n\nmutation AgentsSummarize($params: JSON!) {\n  agentsSummarize(params: $params)\n}'
): (typeof documents)['query ListAgents {\n  listAgents\n}\n\nmutation AnalyzeAgent($agentType: String!, $pageData: JSON!, $query: String, $options: JSON) {\n  analyzeAgent(\n    agentType: $agentType\n    pageData: $pageData\n    query: $query\n    options: $options\n  )\n}\n\nmutation AutoAnalyze($pageData: JSON!, $query: String!) {\n  autoAnalyze(pageData: $pageData, query: $query)\n}\n\nmutation AgentsQuickSeo($params: JSON!) {\n  agentsQuickSeo(params: $params)\n}\n\nmutation AgentsSummarize($params: JSON!) {\n  agentsSummarize(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query EmailRegistered($email: String!) {\n  emailRegistered(email: $email)\n}\n\nmutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n    userMetadata\n    appMetadata\n    createdAt\n    updatedAt\n    isActive\n    isVerified\n    profile {\n      username\n      avatarUrl\n      bio\n      preferences\n      createdAt\n      updatedAt\n    }\n  }\n}'
): (typeof documents)['query EmailRegistered($email: String!) {\n  emailRegistered(email: $email)\n}\n\nmutation SignUp($email: String!, $password: String!, $metadata: JSON) {\n  signUp(email: $email, password: $password, metadata: $metadata) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nmutation SignIn($email: String!, $password: String!) {\n  signIn(email: $email, password: $password) {\n    success\n    requiresConfirmation\n    user {\n      id\n      email\n    }\n    session {\n      accessToken\n      refreshToken\n      expiresIn\n      expiresAt\n      tokenType\n    }\n  }\n}\n\nquery Me {\n  me {\n    id\n    email\n    userMetadata\n    appMetadata\n    createdAt\n    updatedAt\n    isActive\n    isVerified\n    profile {\n      username\n      avatarUrl\n      bio\n      preferences\n      createdAt\n      updatedAt\n    }\n  }\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nquery ChatConversation($conversationId: String!) {\n  chatConversation(conversationId: $conversationId)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}'
): (typeof documents)['query ChatProviders {\n  chatProviders\n}\n\nquery ChatConversations($limit: Int) {\n  chatConversations(limit: $limit)\n}\n\nquery ChatConversation($conversationId: String!) {\n  chatConversation(conversationId: $conversationId)\n}\n\nmutation ChatCompletion($params: JSON!) {\n  chatCompletion(params: $params)\n}\n\nmutation DeleteConversation($conversationId: String!) {\n  deleteConversation(conversationId: $conversationId)\n}'];
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
  source: 'query GmailListMessages($params: JSON) {\n  gmailListMessages(params: $params)\n}\n\nquery GmailGetMessage($params: JSON) {\n  gmailGetMessage(params: $params)\n}\n\nquery GmailListThreads($params: JSON) {\n  gmailListThreads(params: $params)\n}\n\nquery GmailGetThread($params: JSON) {\n  gmailGetThread(params: $params)\n}'
): (typeof documents)['query GmailListMessages($params: JSON) {\n  gmailListMessages(params: $params)\n}\n\nquery GmailGetMessage($params: JSON) {\n  gmailGetMessage(params: $params)\n}\n\nquery GmailListThreads($params: JSON) {\n  gmailListThreads(params: $params)\n}\n\nquery GmailGetThread($params: JSON) {\n  gmailGetThread(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query GoogleCalendarListEvents($params: JSON) {\n  googleCalendarListEvents(params: $params)\n}'
): (typeof documents)['query GoogleCalendarListEvents($params: JSON) {\n  googleCalendarListEvents(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query GoogleDriveListFiles($params: JSON) {\n  googleDriveListFiles(params: $params)\n}'
): (typeof documents)['query GoogleDriveListFiles($params: JSON) {\n  googleDriveListFiles(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query GooglePeopleListContacts($params: JSON) {\n  googlePeopleListContacts(params: $params)\n}'
): (typeof documents)['query GooglePeopleListContacts($params: JSON) {\n  googlePeopleListContacts(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query GooglePhotosList($params: JSON) {\n  googlePhotosList(params: $params)\n}'
): (typeof documents)['query GooglePhotosList($params: JSON) {\n  googlePhotosList(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query GoogleTasksListTasklists($params: JSON) {\n  googleTasksListTasklists(params: $params)\n}\n\nquery GoogleTasksEnsureKanbanLists($params: JSON) {\n  googleTasksEnsureKanbanLists(params: $params)\n}\n\nquery GoogleTasksListTasks($params: JSON) {\n  googleTasksListTasks(params: $params)\n}\n\nmutation GoogleTasksInsertTask($params: JSON) {\n  googleTasksInsertTask(params: $params)\n}\n\nmutation GoogleTasksUpdateTask($params: JSON) {\n  googleTasksUpdateTask(params: $params)\n}\n\nmutation GoogleTasksDeleteTask($params: JSON) {\n  googleTasksDeleteTask(params: $params)\n}\n\nmutation GoogleTasksMoveTask($params: JSON) {\n  googleTasksMoveTask(params: $params)\n}'
): (typeof documents)['query GoogleTasksListTasklists($params: JSON) {\n  googleTasksListTasklists(params: $params)\n}\n\nquery GoogleTasksEnsureKanbanLists($params: JSON) {\n  googleTasksEnsureKanbanLists(params: $params)\n}\n\nquery GoogleTasksListTasks($params: JSON) {\n  googleTasksListTasks(params: $params)\n}\n\nmutation GoogleTasksInsertTask($params: JSON) {\n  googleTasksInsertTask(params: $params)\n}\n\nmutation GoogleTasksUpdateTask($params: JSON) {\n  googleTasksUpdateTask(params: $params)\n}\n\nmutation GoogleTasksDeleteTask($params: JSON) {\n  googleTasksDeleteTask(params: $params)\n}\n\nmutation GoogleTasksMoveTask($params: JSON) {\n  googleTasksMoveTask(params: $params)\n}'];
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
  source: 'query InstalledApps {\n  installedApps {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveInstalledApps($appIds: [String!]!) {\n  saveInstalledApps(appIds: $appIds) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveFileAssociations($associations: JSON!) {\n  saveFileAssociations(associations: $associations) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}'
): (typeof documents)['query InstalledApps {\n  installedApps {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveInstalledApps($appIds: [String!]!) {\n  saveInstalledApps(appIds: $appIds) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}\n\nmutation SaveFileAssociations($associations: JSON!) {\n  saveFileAssociations(associations: $associations) {\n    id\n    ownerId\n    appIds\n    fileAssociations\n    updatedAt\n  }\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query LinkedGoogleAccounts {\n  linkedGoogleAccounts\n}\n\nquery GetLinkedGoogleAccountToken($googleUserId: String!) {\n  getLinkedGoogleAccountToken(googleUserId: $googleUserId)\n}\n\nmutation AddLinkedGoogleAccount($params: JSON!) {\n  addLinkedGoogleAccount(params: $params)\n}\n\nmutation RemoveLinkedGoogleAccount($googleUserId: String!) {\n  removeLinkedGoogleAccount(googleUserId: $googleUserId)\n}\n\nmutation RefreshLinkedGoogleAccountToken($googleUserId: String!, $accessToken: String!, $expiresAt: Float!, $scopesGranted: String) {\n  refreshLinkedGoogleAccountToken(\n    googleUserId: $googleUserId\n    accessToken: $accessToken\n    expiresAt: $expiresAt\n    scopesGranted: $scopesGranted\n  )\n}'
): (typeof documents)['query LinkedGoogleAccounts {\n  linkedGoogleAccounts\n}\n\nquery GetLinkedGoogleAccountToken($googleUserId: String!) {\n  getLinkedGoogleAccountToken(googleUserId: $googleUserId)\n}\n\nmutation AddLinkedGoogleAccount($params: JSON!) {\n  addLinkedGoogleAccount(params: $params)\n}\n\nmutation RemoveLinkedGoogleAccount($googleUserId: String!) {\n  removeLinkedGoogleAccount(googleUserId: $googleUserId)\n}\n\nmutation RefreshLinkedGoogleAccountToken($googleUserId: String!, $accessToken: String!, $expiresAt: Float!, $scopesGranted: String) {\n  refreshLinkedGoogleAccountToken(\n    googleUserId: $googleUserId\n    accessToken: $accessToken\n    expiresAt: $expiresAt\n    scopesGranted: $scopesGranted\n  )\n}'];
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
  source: 'query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagDocuments($collectionName: String, $limit: Int, $offset: Int) {\n  ragDocuments(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nquery RagStats($collectionName: String) {\n  ragStats(collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}\n\nmutation RagDelete($documentId: String!) {\n  ragDelete(documentId: $documentId)\n}\n\nmutation RagUpload($params: JSON!) {\n  ragUpload(params: $params)\n}'
): (typeof documents)['query RagList($collectionName: String, $limit: Int, $offset: Int) {\n  ragList(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagDocuments($collectionName: String, $limit: Int, $offset: Int) {\n  ragDocuments(collectionName: $collectionName, limit: $limit, offset: $offset)\n}\n\nquery RagQuery($query: String!, $k: Int, $collectionName: String) {\n  ragQuery(query: $query, k: $k, collectionName: $collectionName)\n}\n\nquery RagStats($collectionName: String) {\n  ragStats(collectionName: $collectionName)\n}\n\nmutation RagIngest($params: JSON!) {\n  ragIngest(params: $params)\n}\n\nmutation RagDelete($documentId: String!) {\n  ragDelete(documentId: $documentId)\n}\n\nmutation RagUpload($params: JSON!) {\n  ragUpload(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}\n\nmutation StorageGetUrl($params: JSON!) {\n  storageGetUrl(params: $params)\n}\n\nmutation StorageDelete($params: JSON!) {\n  storageDelete(params: $params)\n}\n\nmutation StorageMove($params: JSON!) {\n  storageMove(params: $params)\n}\n\nmutation StorageMkdir($params: JSON!) {\n  storageMkdir(params: $params)\n}'
): (typeof documents)['query StorageBuckets($params: JSON) {\n  storageBuckets(params: $params)\n}\n\nquery StorageList($params: JSON) {\n  storageList(params: $params)\n}\n\nmutation StorageUpload($params: JSON!) {\n  storageUpload(params: $params)\n}\n\nmutation StorageGetUrl($params: JSON!) {\n  storageGetUrl(params: $params)\n}\n\nmutation StorageDelete($params: JSON!) {\n  storageDelete(params: $params)\n}\n\nmutation StorageMove($params: JSON!) {\n  storageMove(params: $params)\n}\n\nmutation StorageMkdir($params: JSON!) {\n  storageMkdir(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query TodoTasks($workspaceId: String!) {\n  todoTasks(workspaceId: $workspaceId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoTask($workspaceId: String!, $column: String!, $title: String!) {\n  createTodoTask(workspaceId: $workspaceId, column: $column, title: $title) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation MoveTodoTask($taskId: String!, $column: String!, $previousTaskId: String) {\n  moveTodoTask(taskId: $taskId, column: $column, previousTaskId: $previousTaskId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoTask($taskId: String!) {\n  deleteTodoTask(taskId: $taskId)\n}'
): (typeof documents)['query TodoTasks($workspaceId: String!) {\n  todoTasks(workspaceId: $workspaceId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoTask($workspaceId: String!, $column: String!, $title: String!) {\n  createTodoTask(workspaceId: $workspaceId, column: $column, title: $title) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation MoveTodoTask($taskId: String!, $column: String!, $previousTaskId: String) {\n  moveTodoTask(taskId: $taskId, column: $column, previousTaskId: $previousTaskId) {\n    id\n    title\n    column\n    sortOrder\n    workspaceId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoTask($taskId: String!) {\n  deleteTodoTask(taskId: $taskId)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query TodoWorkspaces($googleUserId: String!) {\n  todoWorkspaces(googleUserId: $googleUserId) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoWorkspace($googleUserId: String!, $name: String!, $params: JSON) {\n  createTodoWorkspace(googleUserId: $googleUserId, name: $name, params: $params) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation RenameTodoWorkspace($workspaceId: String!, $name: String!) {\n  renameTodoWorkspace(workspaceId: $workspaceId, name: $name) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoWorkspace($workspaceId: String!) {\n  deleteTodoWorkspace(workspaceId: $workspaceId)\n}'
): (typeof documents)['query TodoWorkspaces($googleUserId: String!) {\n  todoWorkspaces(googleUserId: $googleUserId) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateTodoWorkspace($googleUserId: String!, $name: String!, $params: JSON) {\n  createTodoWorkspace(googleUserId: $googleUserId, name: $name, params: $params) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation RenameTodoWorkspace($workspaceId: String!, $name: String!) {\n  renameTodoWorkspace(workspaceId: $workspaceId, name: $name) {\n    id\n    name\n    storage\n    googleUserId\n    backlogListId\n    todoListId\n    doingListId\n    doneListId\n    createdAt\n    updatedAt\n  }\n}\n\nmutation DeleteTodoWorkspace($workspaceId: String!) {\n  deleteTodoWorkspace(workspaceId: $workspaceId)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}'
): (typeof documents)['mutation AnalyzeImage($params: JSON!) {\n  analyzeImage(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query WeatherForecast($params: JSON) {\n  weatherForecast(params: $params)\n}'
): (typeof documents)['query WeatherForecast($params: JSON) {\n  weatherForecast(params: $params)\n}'];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: 'query WorkflowDefinitions {\n  workflowDefinitions {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nquery WorkflowRuns($workflowId: String) {\n  workflowRuns(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateWorkflowDefinition($name: String!, $spec: JSON!) {\n  createWorkflowDefinition(name: $name, spec: $spec) {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nmutation StartWorkflowRun($workflowId: String!) {\n  startWorkflowRun(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}'
): (typeof documents)['query WorkflowDefinitions {\n  workflowDefinitions {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nquery WorkflowRuns($workflowId: String) {\n  workflowRuns(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}\n\nmutation CreateWorkflowDefinition($name: String!, $spec: JSON!) {\n  createWorkflowDefinition(name: $name, spec: $spec) {\n    id\n    name\n    ownerId\n    spec\n    createdAt\n    updatedAt\n  }\n}\n\nmutation StartWorkflowRun($workflowId: String!) {\n  startWorkflowRun(workflowId: $workflowId) {\n    id\n    workflowId\n    ownerId\n    status\n    createdAt\n    updatedAt\n  }\n}'];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
