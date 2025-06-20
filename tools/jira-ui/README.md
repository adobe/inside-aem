# JIRA Issue Creator

A simplified, minimal web interface for creating issues in an on-premise JIRA instance. Built with vanilla HTML, CSS, and JavaScript according to enterprise requirements.
![image](https://git.corp.adobe.com/Blackbird/jira-ui/assets/371/7a579bb2-53a8-491f-8639-5d73d135a9b9)

## Features

- **Secure Authentication**: Login with corporate JIRA credentials
- **Project-Focused**: Automatic selection of predetermined default project
- **Issue Type Support**: Create "Experiment" or "Co-Innovation" issues
- **Conditional Fields**: Dynamic field display based on issue type
- **Auto-Assignment**: Issues are automatically assigned to the logged-in user
- **Session Persistence**: Stay logged in across browser sessions
- **Modern UI**: Clean, responsive design with professional styling

## File Structure

```
jira-ui/
├── index.html          # Main application interface
├── styles.css          # Styling and responsive design
├── script.js           # Core functionality and JIRA API integration
├── config.js           # Configuration constants and settings
└── README.md           # This file
```

## Setup and Configuration

### 1. JIRA Instance Configuration

Before using this application, you need to configure it for your specific JIRA instance:

#### Custom Field IDs
In `config.js`, update the `CUSTOM_FIELDS` section with your actual JIRA custom field IDs:

```javascript
CUSTOM_FIELDS: {
    CUSTOMER_NAMES: 'customfield_10001',  // Replace with actual field ID
    SLACK_CHANNELS: 'customfield_10002',  // Replace with actual field ID
    GIT_REPO_URL: 'customfield_10003'     // Replace with actual field ID
}
```

To find your custom field IDs:
1. Go to JIRA Administration → Issues → Custom Fields
2. Find the relevant fields and note their IDs
3. Or use the JIRA API: `GET /rest/api/2/field` to list all fields

#### Issue Types
Ensure your JIRA project has issue types named:
- "Experiment"
- "Co-Innovation"

If your issue types have different names, update them in `config.js`:

```javascript
ISSUE_TYPES: {
    EXPERIMENT: 'your-experiment-type-name',
    CO_INNOVATION: 'your-co-innovation-type-name'
}
```

### 2. Web Server Deployment

This application needs to be served from a web server due to CORS restrictions when making API calls to JIRA.

#### Option A: Simple HTTP Server (Development)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

#### Option B: Production Web Server
Deploy the files to your preferred web server (Apache, Nginx, IIS, etc.)

### 3. JIRA API Token (Recommended)

For enhanced security, use API tokens instead of passwords:

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create a new API token
3. Use your email address as the username and the API token as the password

## Usage

### Login Process

1. **JIRA Instance URL**: Enter your JIRA base URL (e.g., `https://company.atlassian.net`)
2. **Username**: Your JIRA username or email address
3. **Password/API Token**: Your password or API token
4. **Project Key**: The key of your default project (e.g., "PROJ")

### Creating Issues

1. **Select Issue Type**: Choose between "Experiment" or "Co-Innovation"
2. **Fill Required Fields**: Title and Description are always required
3. **Conditional Fields**:
   - **Co-Innovation**: Customer Names (required) + optional Slack Channel URLs
   - **Experiment**: Optional Git Repository URL
4. **Submit**: Click "Create Issue" to submit to JIRA

### Dynamic Fields

- **Slack Channel URLs**: Use "Add Channel URL" button to add multiple Slack channels
- **Field Validation**: All fields are validated before submission
- **Auto-Clear**: Form clears automatically after successful issue creation

## Technical Details

### Browser Compatibility
- Modern browsers with ES6+ support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

### Security Considerations
- Credentials are stored in browser localStorage for session persistence
- Basic Authentication is used for JIRA API calls
- No credentials are transmitted to external servers
- HTTPS is recommended for production deployment

### API Integration
- Uses JIRA REST API v2
- Authenticates via Basic Auth
- Validates user permissions and project access
- Creates issues with proper field mapping

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the application is served from a web server, not opened as a file
2. **Authentication Failed**: Check username/password and JIRA URL
3. **Project Not Found**: Verify the project key and user permissions
4. **Custom Fields Not Saving**: Update custom field IDs in `config.js`

### Error Messages
The application provides detailed error messages for:
- Authentication failures
- Network connectivity issues
- Validation errors
- JIRA API errors

### Browser Console
Check the browser console for detailed error information during development.

## Customization

### Adding New Fields
1. Add the field to the HTML form in `index.html`
2. Update validation logic in `script.js`
3. Add field mapping in the `buildIssueData()` function
4. Update custom field IDs in `config.js`

### Styling Changes
Modify `styles.css` to customize:
- Color scheme
- Layout and spacing
- Responsive breakpoints
- Animation effects

### Configuration Options
Update `config.js` to modify:
- Validation rules
- UI behavior
- API settings
- Custom field mappings

## Requirements Compliance

This application fulfills all specified functional and non-functional requirements:

✅ **Functional Requirements**
- FR-1: User authentication with corporate JIRA credentials
- FR-2: Automatic default project selection
- FR-3: Issue type selection (Experiment/Co-Innovation)
- FR-4: Mandatory Title and Description fields
- FR-5: Conditional fields based on issue type
- FR-6: Dynamic Slack URL field addition
- FR-7: Automatic issue assignment to logged-in user
- FR-8: No file attachment functionality
- FR-9: Success message with issue key and form clearing

✅ **Non-Functional Requirements**
- NFR-1: Vanilla HTML, CSS, JavaScript only (no frameworks)
- Clean, fast, and minimal interface
- JIRA API integration

## License

This application is developed for internal enterprise use according to the specified requirements. 
