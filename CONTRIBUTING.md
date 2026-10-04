# Contributing

Thanks for helping ACF! This project is maintained by volunteers, so every change is small,
reviewable and documented.

1. **Read [`CLAUDE.md`](CLAUDE.md)** — stack, folder conventions, coding standards, i18n/RTL rules
   and security rules apply to everyone, not only to Claude.
2. **Pick work from the [roadmap](docs/roadmap.md).** One phase (or part of one) per branch.
3. **Branch** from `main` (`feat/…`, `fix/…`, `docs/…`); never push to `main` directly.
4. **Before pushing**, run:
   ```bash
   npm run lint && npm run typecheck && npm run format:check && npm run i18n:check && npm test
   npm run build && npm run test:e2e
   ```
5. **Every user-facing string** goes into `messages/ar.json`, `fr.json` and `en.json`; check new
   screens in Arabic (RTL) and one LTR language.
6. **Open a pull request** describing what changed, how you verified it, your assumptions and any
   open questions — and **append your decisions to [`docs/decisions.md`](docs/decisions.md)**.
7. Never commit secrets; `.env*` files are ignored, document new variables in `.env.example`.

## Code of conduct

Be respectful and constructive. Harassment or discrimination of any kind is not tolerated.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
