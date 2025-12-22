import { RepositoryInfo } from '../models/issue';

export const normalizeFilterValues = (values: string[] | undefined): string[] =>
  (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);

export const matchesOrganizationFilter = (owner: string, organizationFilter: string[]): boolean => {
  if (organizationFilter.length === 0) {
    return true;
  }
  const ownerLower = owner.toLowerCase();
  return organizationFilter.some((org) => org.toLowerCase() === ownerLower);
};

export const matchesRepositoryFilter = (
  owner: string,
  repo: string,
  repositoryFilter: string[]
): boolean => {
  if (repositoryFilter.length === 0) {
    return true;
  }
  const ownerLower = owner.toLowerCase();
  const repoLower = repo.toLowerCase();

  return repositoryFilter.some((entry) => {
    const normalized = entry.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    const parts = normalized.split('/');
    if (parts.length === 1) {
      return parts[0] === repoLower;
    }
    if (parts.length === 2) {
      const [filterOwner, filterRepo] = parts;
      if (!filterOwner || !filterRepo) {
        return false;
      }
      return filterOwner === ownerLower && filterRepo === repoLower;
    }
    return false;
  });
};

export const evaluateSyncFilters = (
  repoInfo: RepositoryInfo,
  repositoryFilter: string[],
  organizationFilter: string[]
): { allowed: boolean; filteredBy: string[] } => {
  const filteredBy: string[] = [];
  if (!matchesOrganizationFilter(repoInfo.owner, organizationFilter)) {
    filteredBy.push('organizationFilter');
  }
  if (!matchesRepositoryFilter(repoInfo.owner, repoInfo.repo, repositoryFilter)) {
    filteredBy.push('repositoryFilter');
  }
  return {
    allowed: filteredBy.length === 0,
    filteredBy,
  };
};
