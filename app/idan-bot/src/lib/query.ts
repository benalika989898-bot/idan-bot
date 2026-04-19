import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

export const schedulerKeys = {
  all: ['scheduler'] as const,
  primaryAccount: () => [...schedulerKeys.all, 'primaryAccount'] as const,
  groups: (accountId: string) => [...schedulerKeys.all, 'groups', accountId] as const,
  scheduledPosts: () => [...schedulerKeys.all, 'scheduledPosts'] as const,
  scheduledPost: (id: string) => [...schedulerKeys.all, 'scheduledPost', id] as const,
};
