const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static('.'));

// JIRA API Proxy endpoint
app.all('/api/jira/*', async (req, res) => {
    try {
        // Extract the JIRA URL and endpoint from the request
        const jiraUrl = req.headers['x-jira-url'];
        const jiraEndpoint = req.params[0]; // Everything after /api/jira/
        
        console.log(`🔍 Proxy request: ${req.method} ${jiraEndpoint}`);
        console.log(`🌐 JIRA URL: ${jiraUrl}`);
        console.log(`🔑 Has Authorization: ${!!req.headers.authorization}`);
        
        if (!jiraUrl) {
            console.log('❌ Missing X-JIRA-URL header');
            return res.status(400).json({ error: 'Missing X-JIRA-URL header' });
        }
        
        // Construct the full JIRA API URL
        const fullUrl = `${jiraUrl}/rest/api/2/${jiraEndpoint}`;
        console.log(`📍 Full URL: ${fullUrl}`);
        
        // Forward the authorization header
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (req.headers.authorization) {
            headers.Authorization = req.headers.authorization;
            console.log(`🔐 Authorization header: ${req.headers.authorization.substring(0, 20)}...`);
        } else {
            console.log('⚠️ No Authorization header found');
        }
        
        // Make the request to JIRA
        const response = await fetch(fullUrl, {
            method: req.method,
            headers: headers,
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        
        console.log(`📊 JIRA Response: ${response.status} ${response.statusText}`);
        
        const data = await response.text();
        
        // Forward the response status and data
        res.status(response.status);
        
        // Try to parse as JSON, fallback to text
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (e) {
            res.send(data);
        }
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: 'Proxy server error', 
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'JIRA Proxy Server is running' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 JIRA Proxy Server running on http://localhost:${PORT}`);
    console.log(`📝 JIRA UI available at: http://localhost:${PORT}`);
    console.log(`🔧 Proxy endpoint: http://localhost:${PORT}/api/jira/*`);
}); 