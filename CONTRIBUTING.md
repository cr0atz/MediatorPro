# Contributing to Mediator Pro

Thank you for considering contributing to Mediator Pro! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and what behavior you expected**
* **Include screenshots if possible**
* **Include your environment details** (OS, Node.js version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Provide specific examples to demonstrate the enhancement**
* **Explain why this enhancement would be useful**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Write clear commit messages**
6. **Submit a pull request**

## 💻 Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/mediator-pro.git
   cd mediator-pro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. Run database migrations:
   ```bash
   npm run db:push
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## 📝 Coding Standards

### TypeScript

* Use TypeScript for all new code
* Maintain strict type checking
* Avoid using `any` type unless absolutely necessary
* Document complex type definitions

### Code Style

* Use 2 spaces for indentation
* Use semicolons
* Use single quotes for strings
* Add trailing commas in multi-line objects/arrays
* Follow existing code patterns

### React Components

* Use functional components with hooks
* Keep components focused and single-purpose
* Extract reusable logic into custom hooks
* Use TypeScript interfaces for props
* Add data-testid attributes for testable elements

### API Design

* Follow RESTful conventions
* Use appropriate HTTP status codes
* Validate all inputs with Zod
* Return consistent error responses
* Document all endpoints

### Database

* Use Drizzle ORM for all queries
* Never write raw SQL queries
* Add proper indexes for performance
* Use migrations for schema changes
* Document schema relationships

## 🧪 Testing

* Write tests for new features
* Ensure all tests pass before submitting PR
* Maintain or improve code coverage
* Test edge cases and error conditions

Run tests:
```bash
npm test
```

## 📚 Documentation

* Update README.md for user-facing changes
* Update Install.md for deployment changes
* Update Project_Status.md for feature additions
* Add JSDoc comments for complex functions
* Update API documentation if applicable

## 🔄 Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

* `feat:` - New feature
* `fix:` - Bug fix
* `docs:` - Documentation changes
* `style:` - Code style changes (formatting, etc.)
* `refactor:` - Code refactoring
* `test:` - Adding or updating tests
* `chore:` - Maintenance tasks

Examples:
```
feat: add calendar event duplicate filtering
fix: resolve timezone issue in event creation
docs: update installation guide for Ubuntu 22.04
refactor: extract email template logic to service
```

## 🔍 Code Review Process

1. **Automated checks must pass** (linting, tests, build)
2. **At least one maintainer review** is required
3. **Address all review comments** or explain why changes aren't needed
4. **Keep PRs focused** - one feature or fix per PR
5. **Rebase on main** before merging to keep history clean

## 📋 Issue Labels

* `bug` - Something isn't working
* `enhancement` - New feature or request
* `documentation` - Documentation improvements
* `good first issue` - Good for newcomers
* `help wanted` - Extra attention needed
* `question` - Further information requested
* `wontfix` - This will not be worked on

## 🚀 Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Deploy to production
5. Announce release

## 🛡️ Security

* **Never commit secrets** or credentials
* **Report security vulnerabilities** privately to security@mediatorpro.com
* **Follow security best practices** for dependencies
* **Keep dependencies up to date**

## 📞 Getting Help

* **GitHub Discussions** - For questions and discussions
* **GitHub Issues** - For bugs and feature requests
* **Email** - support@mediatorpro.com for private inquiries

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

* Using welcoming and inclusive language
* Being respectful of differing viewpoints
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project team at conduct@mediatorpro.com.

## 📄 License

By contributing to Mediator Pro, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Mediator Pro! 🙏
