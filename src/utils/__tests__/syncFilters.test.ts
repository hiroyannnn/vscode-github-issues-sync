import {
  evaluateSyncFilters,
  matchesOrganizationFilter,
  matchesRepositoryFilter,
  normalizeFilterValues,
} from '../syncFilters';

describe('normalizeFilterValues', () => {
  it('trims values and removes empty entries', () => {
    expect(normalizeFilterValues(['', '  ', ' foo ', 'bar'])).toEqual(['foo', 'bar']);
  });
});

describe('matchesOrganizationFilter', () => {
  it('returns true when filter is empty', () => {
    expect(matchesOrganizationFilter('owner', [])).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(matchesOrganizationFilter('Owner', ['owner'])).toBe(true);
  });

  it('returns false when not matched', () => {
    expect(matchesOrganizationFilter('owner', ['other'])).toBe(false);
  });
});

describe('matchesRepositoryFilter', () => {
  it('returns true when filter is empty', () => {
    expect(matchesRepositoryFilter('owner', 'repo', [])).toBe(true);
  });

  it('matches by repo name only', () => {
    expect(matchesRepositoryFilter('owner', 'repo', ['repo'])).toBe(true);
  });

  it('matches by owner/repo', () => {
    expect(matchesRepositoryFilter('owner', 'repo', ['owner/repo'])).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(matchesRepositoryFilter('Owner', 'Repo', ['OWNER/REPO'])).toBe(true);
  });

  it('returns false for mismatched owner', () => {
    expect(matchesRepositoryFilter('owner', 'repo', ['other/repo'])).toBe(false);
  });

  it('returns false for malformed entries', () => {
    expect(matchesRepositoryFilter('owner', 'repo', ['/owner/repo'])).toBe(false);
    expect(matchesRepositoryFilter('owner', 'repo', ['owner/repo/'])).toBe(false);
    expect(matchesRepositoryFilter('owner', 'repo', ['owner//repo'])).toBe(false);
  });
});

describe('evaluateSyncFilters', () => {
  const repoInfo = {
    owner: 'Acme',
    repo: 'Widget',
    remoteUrl: 'https://github.com/Acme/Widget',
  };

  it('allows sync when no filters are set', () => {
    expect(evaluateSyncFilters(repoInfo, [], [])).toEqual({
      allowed: true,
      filteredBy: [],
    });
  });

  it('blocks sync when organization filter does not match', () => {
    expect(evaluateSyncFilters(repoInfo, [], ['other'])).toEqual({
      allowed: false,
      filteredBy: ['organizationFilter'],
    });
  });

  it('blocks sync when repository filter does not match', () => {
    expect(evaluateSyncFilters(repoInfo, ['other/repo'], [])).toEqual({
      allowed: false,
      filteredBy: ['repositoryFilter'],
    });
  });

  it('blocks sync when both filters do not match', () => {
    expect(evaluateSyncFilters(repoInfo, ['other/repo'], ['other'])).toEqual({
      allowed: false,
      filteredBy: ['organizationFilter', 'repositoryFilter'],
    });
  });
});
