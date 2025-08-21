# Contributing to Regu-Graph Explorer

Thank you for your interest in contributing to Regu-Graph Explorer! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Reports**: Report bugs and issues you encounter
- **Feature Requests**: Suggest new features and improvements
- **Code Contributions**: Submit pull requests with code changes
- **Documentation**: Improve or add documentation
- **Testing**: Help test the application and report issues
- **Design**: Contribute to UI/UX improvements

### Before You Start

1. **Check existing issues** to see if your contribution is already being worked on
2. **Read the README** to understand the project structure
3. **Review the TODO list** to see current development priorities
4. **Join discussions** in GitHub Discussions to get feedback on your ideas

## 🚀 Development Setup

### Prerequisites

- **Node.js**: Version 18 or higher
- **Package Manager**: pnpm (recommended) or npm
- **Git**: Latest version
- **Code Editor**: VS Code with recommended extensions (see below)

### Local Development Setup

```bash
# Clone the repository
git clone <your-fork-url>
cd regu-graph-explorer

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
pnpm dev
```

### Recommended VS Code Extensions

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Tailwind CSS support
- **TypeScript Importer**: Auto-import TypeScript modules
- **GitLens**: Enhanced Git functionality

## 📋 Development Workflow

### Branch Strategy

We use a simple branching strategy:

- **main**: Production-ready code
- **develop**: Development branch for features
- **feature/***: Feature branches (e.g., `feature/document-viewer`)
- **bugfix/***: Bug fix branches (e.g., `bugfix/pdf-rendering`)
- **hotfix/***: Critical production fixes

### Creating a Feature Branch

```bash
# Ensure you're on the develop branch
git checkout develop
git pull origin develop

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "feat: add document viewer component"

# Push to your fork
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add PDF document viewer component
fix(workspace): resolve canvas rendering issues
docs: update README with new features
refactor(store): simplify state management
```

## 🏗️ Code Standards

### TypeScript Guidelines

- **Strict Mode**: Always use strict TypeScript settings
- **Type Definitions**: Define interfaces for all props, state, and API responses
- **Avoid `any`**: Use proper types or `unknown` when necessary
- **Generic Types**: Use generics for reusable, type-safe logic

### React Guidelines

- **Functional Components**: Use functional components with hooks exclusively
- **Props Interface**: Define interfaces for all component props
- **State Management**: Use Zustand for global state, local state for component-specific data
- **Performance**: Implement React.memo and useMemo when appropriate

### Styling Guidelines

- **Tailwind CSS**: Use Tailwind utility classes for styling
- **Component Variants**: Use class-variance-authority for component variants
- **Responsive Design**: Implement mobile-first responsive design
- **Accessibility**: Ensure proper contrast ratios and semantic HTML

### File Organization

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── feature/        # Feature-specific components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── store/              # Zustand stores
├── services/           # API and business logic services
├── lib/                # Utility functions and configurations
└── types/              # TypeScript type definitions
```

## 🧪 Testing

### Testing Requirements

- **Unit Tests**: Write tests for utility functions and hooks
- **Component Tests**: Test component behavior with React Testing Library
- **Integration Tests**: Test component interactions and workflows
- **Coverage**: Aim for at least 80% test coverage

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- src/components/workspace/DocumentViewer.test.tsx
```

### Writing Tests

```typescript
// Example test structure
import { render, screen } from '@testing-library/react';
import { DocumentViewer } from './DocumentViewer';

describe('DocumentViewer', () => {
  it('renders PDF content correctly', () => {
    const mockDocumentData = { /* mock data */ };
    
    render(<DocumentViewer documentData={mockDocumentData} />);
    
    expect(screen.getByText('Document Title')).toBeInTheDocument();
  });

  it('handles missing document data gracefully', () => {
    render(<DocumentViewer documentData={null} />);
    
    expect(screen.getByText('No document loaded')).toBeInTheDocument();
  });
});
```

## 🔍 Code Review Process

### Pull Request Guidelines

1. **Clear Title**: Use descriptive titles that explain the change
2. **Detailed Description**: Explain what was changed and why
3. **Screenshots/Videos**: Include visual evidence for UI changes
4. **Test Coverage**: Ensure new code is properly tested
5. **Performance Impact**: Consider and document performance implications

### Review Checklist

**Code Quality:**
- [ ] Code follows project conventions
- [ ] Proper error handling implemented
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met

**Testing:**
- [ ] Unit tests written and passing
- [ ] Integration tests cover new functionality
- [ ] Edge cases tested
- [ ] Performance tests for large documents

**Documentation:**
- [ ] Code comments explain complex logic
- [ ] README updated if needed
- [ ] API changes documented
- [ ] User-facing changes documented

### Review Process

1. **Create PR**: Submit your pull request
2. **Automated Checks**: Ensure CI/CD checks pass
3. **Code Review**: Address feedback from maintainers
4. **Testing**: Verify changes work as expected
5. **Approval**: Get approval from at least one maintainer
6. **Merge**: Changes are merged to the main branch

## 🐛 Bug Reports

### Reporting Bugs

When reporting bugs, please include:

- **Clear Description**: What happened vs. what you expected
- **Steps to Reproduce**: Detailed steps to recreate the issue
- **Environment**: Browser, OS, and version information
- **Screenshots**: Visual evidence of the issue
- **Console Logs**: Any error messages or warnings
- **File Types**: What type of document caused the issue

### Bug Report Template

```markdown
## Bug Description
Brief description of what happened

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Environment
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- App Version: [e.g., 1.0.0]

## Additional Information
Any other context, screenshots, or logs
```

## 💡 Feature Requests

### Suggesting Features

When suggesting new features:

- **Clear Use Case**: Explain the problem the feature solves
- **User Impact**: Describe how it improves the user experience
- **Implementation Ideas**: Suggest possible approaches (optional)
- **Priority**: Indicate if it's a nice-to-have or critical feature

### Feature Request Template

```markdown
## Feature Description
Brief description of the requested feature

## Problem Statement
What problem does this feature solve?

## Proposed Solution
How should this feature work?

## User Impact
How will this improve the user experience?

## Alternative Solutions
Are there other ways to solve this problem?

## Additional Context
Any other relevant information
```

## 📚 Documentation

### Contributing to Documentation

- **Keep it Updated**: Update documentation when changing code
- **Clear Examples**: Include practical examples and code snippets
- **User-Focused**: Write for users, not just developers
- **Regular Review**: Review and update documentation regularly

### Documentation Types

- **README**: Project overview and getting started
- **API Docs**: Service and component documentation
- **User Guides**: Step-by-step usage instructions
- **Developer Guides**: Technical implementation details

## 🚀 Performance Considerations

### Performance Guidelines

- **Lazy Loading**: Implement lazy loading for large components
- **Memoization**: Use React.memo and useMemo appropriately
- **Bundle Size**: Monitor and optimize bundle size
- **Rendering**: Optimize re-renders and component updates

### Performance Testing

- **Large Documents**: Test with documents of various sizes
- **Memory Usage**: Monitor memory consumption
- **Rendering Speed**: Measure time to interactive
- **Scrolling Performance**: Ensure smooth scrolling in large documents

## 🔒 Security

### Security Guidelines

- **Input Validation**: Validate and sanitize all user inputs
- **API Keys**: Never commit API keys or sensitive data
- **Dependencies**: Keep dependencies updated and secure
- **File Uploads**: Validate file types and sizes

### Security Checklist

- [ ] No sensitive data in code or logs
- [ ] Input validation implemented
- [ ] File uploads secured
- [ ] Dependencies scanned for vulnerabilities
- [ ] Environment variables properly configured

## 🎯 Getting Help

### Communication Channels

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Requests**: For code reviews and feedback
- **Email**: For sensitive or private matters

### Asking Questions

When asking for help:

1. **Search First**: Check existing issues and discussions
2. **Be Specific**: Provide clear, detailed information
3. **Include Context**: Share relevant code and error messages
4. **Be Patient**: Maintainers are volunteers with limited time

## 🙏 Recognition

### Contributor Recognition

- **Contributors List**: All contributors are listed in the README
- **Commit History**: Your contributions are preserved in Git history
- **Release Notes**: Significant contributions are mentioned in releases
- **Community**: Join our growing community of contributors

### Types of Recognition

- **Code Contributors**: Direct code contributions
- **Bug Reporters**: Valuable bug reports and reproductions
- **Feature Requesters**: Well-thought-out feature suggestions
- **Documentation**: Documentation improvements and clarifications
- **Testing**: Testing contributions and feedback

## 📄 License

By contributing to Regu-Graph Explorer, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to Regu-Graph Explorer!** 🎉

Your contributions help make this tool better for everyone who needs to analyze and navigate complex documents.
