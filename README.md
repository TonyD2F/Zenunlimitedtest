# OpenCode Local Gateway

A small, quota-respecting OpenAI-compatible gateway for OpenCode v2 on Debian/proot. It forwards requests to one provider endpoint configured by you, streams responses, and preserves upstream errors and rate-limit responses. It does not claim to provide unlimited usage or bypass provider limits.

See [`opencode-gateway/README.md`](opencode-gateway/README.md) for setup, OpenCode v2 configuration, and tests.

The repository also contains `opencode-unlimited.zip`, an unmodified legacy archive. The supported implementation is `opencode-gateway/`; do not run the legacy archive as part of this setup.
