class ContentError(Exception):
    """Base class for content-service failures the API maps to 4xx."""


class ConcurrencyError(ContentError):
    """The caller's If-Match / version did not match what the database holds."""


class NothingToPublishError(ContentError):
    """Publish was asked to run with no pending drafts anywhere."""


class KeyLossError(ContentError):
    """A write would have dropped a key path that existed before it."""


class UnknownBlockError(ContentError):
    """No such (namespace, locale)."""


class UnknownVersionError(ContentError):
    """No such published revision."""
