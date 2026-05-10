import { gql } from '@apollo/client';

/** Matches graphql/schema.graphql + Strawberry resolvers. */
export const SIGN_UP = gql`
  mutation SignUp($email: String!, $password: String!, $metadata: JSON) {
    signUp(email: $email, password: $password, metadata: $metadata) {
      success
      requiresConfirmation
      user {
        id
        email
      }
      session {
        accessToken
        refreshToken
        expiresIn
        expiresAt
        tokenType
      }
    }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      success
      requiresConfirmation
      user {
        id
        email
      }
      session {
        accessToken
        refreshToken
        expiresIn
        expiresAt
        tokenType
      }
    }
  }
`;
