# Contributing to Telegram Bio Scrobbler

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Help others learn and grow

## How to Contribute

### 1. Reporting Bugs

**Before submitting a bug report:**
- Check [existing issues](https://github.com/kunterk/telegram-bio-scrobble/issues)
- Try updating to the latest version
- Gather relevant information:
  - Python version
  - OS (Windows/Linux/Mac)
  - Environment setup
  - Error message and stack trace

**When submitting:**
- Use a clear, descriptive title
- Describe the exact steps to reproduce
- Provide expected vs actual behavior
- Include logs and error messages
- Include your environment details

### 2. Suggesting Enhancements

**Ideas for improvements:**
- New failsafe options
- Performance optimizations
- Better logging
- Docker/deployment support
- Configuration options

**When suggesting:**
- Use a clear title
- Describe the enhancement and use case
- Show examples of how it would work
- Explain benefits and potential drawbacks

### 3. Submitting Pull Requests

**Setup development environment:**
```bash
git clone https://github.com/YOUR_USERNAME/telegram-bio-scrobble.git
cd telegram-bio-scrobble
git checkout -b feature/your-feature-name
```

**Make your changes:**
- Follow PEP 8 style guide
- Add type hints to functions
- Write docstrings for functions
- Test thoroughly
- Update README/docs if needed

**Commit messages:**
```
format: brief description

Longer explanation of changes if needed.
- Point 1
- Point 2

Fixes #123
```

**Push and open PR:**
```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:
- Clear description of changes
- Reference to related issues
- Any testing instructions

## Development Guidelines

### Code Style

```python
# Good: Clear, typed, documented
async def fetch_now_playing(session: aiohttp.ClientSession) -> Optional[str]:
    """Fetch now playing track from Last.fm API (async)."""
    # Implementation...

# Bad: No type hints, unclear
def fetch(s):
    # Implementation...
```

### Error Handling

```python
# Good: Specific error handling
try:
    async with session.get(url) as resp:
        if resp.status != 200:
            logger.warning(f"API returned {resp.status}")
            return None
except asyncio.TimeoutError:
    logger.warning("Request timeout")
except Exception as e:
    logger.exception("Unexpected error: %s", e)

# Bad: Generic exception handling
try:
    # code
except:
    pass
```

### Logging

```python
# Good: Descriptive logs
logger.info("🤖 Bio dikemas kini -> %s", new_bio)
logger.warning("Telegram FloodWait! Berehat %s saat", wait_seconds)
logger.exception("Critical error: %s", e)

# Bad: Unhelpful logs
print("Done")
logger.debug("x = 5")
```

### Testing

```python
# If adding new features, test:
1. Normal operation
2. Error conditions
3. Edge cases
4. Rate limiting

# Example test structure:
def test_safe_truncate():
    assert safe_truncate("Hello", 10) == "Hello"
    assert safe_truncate("Hello World!", 5) == "Hell…"
    assert safe_truncate("", 10) == ""
```

## Project Structure

```
telegram-bio-scrobble/
├── main.py           # Core logic (async, safe to modify)
├── runner.py         # Process manager (process-critical)
├── requirements.txt  # Dependencies (version-controlled)
├── README.md         # User documentation
├── SETUP.md          # Installation guide
├── CONTRIBUTING.md   # This file
├── LICENSE           # MIT License
├── .gitignore        # Git ignore patterns
└── bot_state.json    # Runtime state (auto-generated, ignored)
```

## Key Modules

### main.py Components

```python
# Configuration
POLL_INTERVAL       # Last.fm check frequency
TRUNCATE_LEN        # Bio character limit
INVISIBLE_MARKER    # Zero-width space for bot detection

# State Management
get_state()         # Load persistent state
save_state()        # Save state to file
safe_truncate()     # Safely truncate strings

# API Interactions
fetch_now_playing() # Async Last.fm fetch
poll_and_update()   # Main bot loop
main()              # Entry point
```

### runner.py Components

```python
# Backoff Management
MAX_BACKOFF         # Maximum retry delay (5min)
INITIAL_BACKOFF     # Starting delay (5s)
RUNTIME_THRESHOLD   # Stability check (60s)

# Process Management
run_app()           # Main runner loop
```

## Common Tasks

### Adding a New Feature

1. **Discuss first** - Open an issue to discuss
2. **Branch** - `git checkout -b feature/name`
3. **Implement** - Add code with tests
4. **Document** - Update README/SETUP.md
5. **Test** - Run locally before PR
6. **PR** - Submit with clear description

### Fixing a Bug

1. **Create issue** - Document the bug
2. **Branch** - `git checkout -b fix/bug-name`
3. **Reproduce** - Verify the issue
4. **Fix** - Minimal change to solve
5. **Test** - Ensure fix works and doesn't break other things
6. **PR** - Reference the issue

### Improving Documentation

1. Edit markdown files (README.md, SETUP.md, etc.)
2. Check formatting and links
3. Submit PR with changes

## Review Process

- Maintainer will review your PR
- May request changes or clarifications
- Once approved, PR will be merged
- Changes will be part of next release

## Release Process

Versions follow [Semantic Versioning](https://semver.org/):
- MAJOR.MINOR.PATCH
- Example: 1.2.3

**Changelog format:**
```markdown
## [1.0.0] - 2026-09-06

### Added
- New feature X
- Documentation for Y

### Changed
- Improved Z performance

### Fixed
- Fixed bug with A
```

## Getting Help

- 💬 **Questions** - Open a discussion
- 🐛 **Bugs** - Open an issue
- 💡 **Ideas** - Discussion or issue
- 📖 **Docs** - Check README and SETUP.md

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing!** 🙏
