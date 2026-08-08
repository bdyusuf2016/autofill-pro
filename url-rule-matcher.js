(function (global) {
  const TYPE_PRIORITY = {
    exact: 500,
    startsWith: 400,
    endsWith: 300,
    contains: 200,
    regex: 100,
  };

  function safeTrim(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeForCompare(value) {
    return safeTrim(value).replace(/\/+$/, "").toLowerCase();
  }

  function buildUrlContext(urlInput) {
    const url = urlInput instanceof URL ? urlInput : new URL(urlInput);
    const hostname = url.hostname;
    const pathname = url.pathname || "/";
    const hostWithPath = `${hostname}${pathname}`;
    const originWithPath = `${url.origin}${pathname}`;
    const fullUrl = `${url.origin}${pathname}${url.search}${url.hash}`;

    return {
      url,
      hostname,
      pathname,
      hostWithPath,
      originWithPath,
      fullUrl,
    };
  }

  function getCandidates(urlContext, includePath) {
    if (includePath) {
      return [urlContext.hostWithPath, urlContext.originWithPath, urlContext.fullUrl];
    }

    return [urlContext.hostname, urlContext.url.origin, urlContext.fullUrl];
  }

  function testRuleAgainstCandidates(rule, candidates) {
    if (!rule || rule.enabled === false) {
      return { matches: false };
    }

    const pattern = safeTrim(rule.pattern);
    if (!pattern) {
      return { matches: false };
    }

    if (rule.type === "regex") {
      try {
        const regex = new RegExp(pattern);
        const matchedValue = candidates.find((candidate) => regex.test(candidate));
        return {
          matches: Boolean(matchedValue),
          matchedValue: matchedValue || null,
        };
      } catch (error) {
        return {
          matches: false,
          error,
        };
      }
    }

    const normalizedPattern = normalizeForCompare(pattern);
    const matchedValue = candidates.find((candidate) => {
      const normalizedCandidate = normalizeForCompare(candidate);

      switch (rule.type) {
        case "exact":
          return normalizedCandidate === normalizedPattern;
        case "contains":
          return normalizedCandidate.includes(normalizedPattern);
        case "startsWith":
          return normalizedCandidate.startsWith(normalizedPattern);
        case "endsWith":
          return normalizedCandidate.endsWith(normalizedPattern);
        default:
          return false;
      }
    });

    return {
      matches: Boolean(matchedValue),
      matchedValue: matchedValue || null,
    };
  }

  function matchRule(urlInput, rule) {
    const urlContext = buildUrlContext(urlInput);
    const candidates = getCandidates(urlContext, rule && rule.includePath);
    const result = testRuleAgainstCandidates(rule, candidates);

    return {
      ...result,
      urlContext,
      candidates,
    };
  }

  function validateRule(rule) {
    const pattern = safeTrim(rule && rule.pattern);
    if (!pattern) {
      return { valid: false, reason: "empty" };
    }

    if (rule && rule.type === "regex") {
      try {
        new RegExp(pattern);
      } catch (error) {
        return { valid: false, reason: "regex", error };
      }
    }

    return { valid: true };
  }

  function findBestMatchingProfile(profiles, urlInput) {
    const urlContext = buildUrlContext(urlInput);
    const items = Array.isArray(profiles) ? profiles : Object.values(profiles || {});
    let bestMatch = null;

    items.forEach((profile, profileIndex) => {
      const rules = Array.isArray(profile && profile.urlRules) ? profile.urlRules : [];

      rules.forEach((rule, ruleIndex) => {
        const evaluation = testRuleAgainstCandidates(
          rule,
          getCandidates(urlContext, rule && rule.includePath)
        );

        if (!evaluation.matches) {
          return;
        }

        const score =
          (TYPE_PRIORITY[rule.type] || 0) * 1000 - ruleIndex * 10 - profileIndex;

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            profile,
            profileId: profile.id,
            rule,
            ruleIndex,
            profileIndex,
            score,
            matchedValue: evaluation.matchedValue,
            urlContext,
          };
        }
      });
    });

    return bestMatch;
  }

  global.UrlRuleMatcher = {
    buildUrlContext,
    getCandidates,
    matchRule,
    validateRule,
    findBestMatchingProfile,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
