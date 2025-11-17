/**
 * Divengine Dashboard - Real-time JavaScript
 * Fetches and displays live data from GitHub API
 */

class DivenginedasDashboard {
  constructor() {
    this.config = null;
    this.cache = new Map();
    this.apiFailures = new Set(); // Track failed endpoints
    this.isUsingMockData = false;
    this.localStorageKey = 'divengine_dashboard_data';
    
    this.init();
  }

  async init() {
    try {
      await this.loadConfig();
      await this.initializeDashboard();
      this.hideLoading();
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      this.showError(error.message);
    }
  }

  async loadConfig() {
    try {
      const response = await fetch('config.json');
      this.config = await response.json();
    } catch (error) {
      throw new Error('Failed to load configuration');
    }
  }

  saveToLocalStorage(data) {
    try {
      const storageData = {
        data: data,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(storageData));
      console.log('Data saved to localStorage');
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return null;
      
      const storageData = JSON.parse(stored);
      
      // Check if data is less than 24 hours old
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - storageData.timestamp > maxAge) {
        localStorage.removeItem(this.localStorageKey);
        return null;
      }
      
      console.log('Loaded data from localStorage');
      return storageData.data;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  }

  async initializeDashboard() {
    // Initialize all dashboard components
    await Promise.all([
      this.loadStats(),
      this.loadProjects(),
      this.loadActivity(),
      this.initCodeDisplay()
    ]);
    
    // Check status and notify user if using demo data
    this.checkApiStatus();
    
    if (this.isUsingMockData) {
      setTimeout(() => {
        this.showNotification('Using cached data - GitHub API unavailable', 'info', 5000);
      }, 1000);
    }
  }

  clearLocalStorage() {
    try {
      localStorage.removeItem(this.localStorageKey);
      this.showNotification('Local cache cleared', 'success', 2000);
      console.log('localStorage cleared');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  async loadStats() {
    const statsGrid = document.querySelector('[data-stats-grid]');
    if (!statsGrid) return;

    try {
      const projects = this.config.explorer.sections[0].items;
      const stats = await this.fetchAllStats(projects);
      
      this.updateStatCard('repos', stats.totalRepos);
      this.updateStatCard('stars', stats.totalStars);
      this.updateStatCard('commits', stats.recentCommits);
      this.updateStatCard('issues', stats.openIssues);
      
      // Check if we're using mock data and show indicator
      this.checkApiStatus();
      
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async fetchAllStats(projects) {
    const stats = {
      totalRepos: projects.length,
      totalStars: 0,
      recentCommits: 0,
      openIssues: 0
    };

    // Fetch data for each project
    for (const project of projects) {
      try {
        const [repoData, commits, issues] = await Promise.all([
          this.fetchGitHubData(`repos/divengine/${project.repo}`),
          this.fetchGitHubData(`repos/divengine/${project.repo}/commits?per_page=5`),
          this.fetchGitHubData(`repos/divengine/${project.repo}/issues?state=open`)
        ]);

        if (repoData) stats.totalStars += repoData.stargazers_count || 0;
        if (commits) stats.recentCommits += commits.length;
        if (issues) stats.openIssues += issues.length;
        
      } catch (error) {
        console.warn(`Failed to fetch data for ${project.repo}:`, error);
      }
    }

    return stats;
  }

  updateStatCard(type, value) {
    const card = document.querySelector(`[data-stat="${type}"]`);
    if (!card) return;

    const valueElement = card.querySelector('.stat-value');
    const currentValue = parseInt(valueElement.textContent) || 0;
    
    // Remove loading state
    card.classList.remove('loading');
    
    // Animate the value change
    this.animateValue(valueElement, currentValue, value, 1000);
  }

  animateValue(element, start, end, duration) {
    const startTime = performance.now();
    const difference = end - start;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const current = Math.floor(start + difference * easeOutQuart);
      element.textContent = this.formatNumber(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  async loadProjects() {
    const projectsGrid = document.querySelector('[data-projects-grid]');
    if (!projectsGrid) return;

    try {
      const projects = this.config.explorer.sections[0].items;
      const projectCards = await Promise.all(
        projects.map(project => this.createProjectCard(project))
      );

      projectsGrid.innerHTML = projectCards.join('');
      
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  async createProjectCard(project) {
    try {
      const repoData = await this.fetchGitHubData(`repos/divengine/${project.repo}`);
      const commits = await this.fetchGitHubData(`repos/divengine/${project.repo}/commits?per_page=1`);
      
      // Safe access to commit data with proper null checks
      const lastCommit = commits && Array.isArray(commits) && commits[0];
      let updatedAt;
      
      if (lastCommit && lastCommit.commit && lastCommit.commit.committer && lastCommit.commit.committer.date) {
        updatedAt = new Date(lastCommit.commit.committer.date);
      } else if (repoData && repoData.updated_at) {
        updatedAt = new Date(repoData.updated_at);
      } else {
        // Default to a recent date if no data available
        updatedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random within last week
      }
      
      return `
        <div class="project-card" data-project="${project.slug}">
          <div class="project-header">
            <h3 class="project-title">${project.label}</h3>
            <div class="project-stats">
              <div class="project-stat">
                <span>⭐</span>
                <span>${repoData?.stargazers_count || 0}</span>
              </div>
              <div class="project-stat">
                <span>🍴</span>
                <span>${repoData?.forks_count || 0}</span>
              </div>
              <div class="project-stat">
                <span>📝</span>
                <span>${repoData?.open_issues_count || 0}</span>
              </div>
            </div>
          </div>
          
          <p class="project-description">${project.description}</p>
          
          <div class="project-tags">
            ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
          </div>
          
          <div class="project-footer">
            <div class="project-updated">
              <span>🕒</span>
              <span>Updated ${this.timeAgo(updatedAt)}</span>
            </div>
            <div class="project-actions">
              <a href="https://github.com/divengine/${project.repo}" target="_blank" class="project-link">
                View Code
              </a>
              <a href="#" onclick="dashboard.viewProject('${project.slug}')" class="project-link">
                Details
              </a>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.warn(`Failed to create card for project ${project.slug}:`, error);
      return `
        <div class="project-card" data-project="${project.slug}">
          <div class="project-header">
            <h3 class="project-title">${project.label}</h3>
          </div>
          <p class="project-description">${project.description}</p>
          <div class="project-tags">
            ${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
          </div>
          <div class="project-footer">
            <div class="project-actions">
              <a href="https://github.com/divengine/${project.repo}" target="_blank" class="project-link">
                View Code
              </a>
            </div>
          </div>
        </div>
      `;
    }
  }

  async loadActivity() {
    const activityFeed = document.querySelector('[data-activity-feed]');
    if (!activityFeed) return;

    try {
      const projects = this.config.explorer.sections[0].items;
      const activities = [];

      // Fetch recent activity from all projects
      for (const project of projects.slice(0, 5)) { // Limit to 5 projects for performance
        try {
          const commits = await this.fetchGitHubData(`repos/divengine/${project.repo}/commits?per_page=3`);
          const issues = await this.fetchGitHubData(`repos/divengine/${project.repo}/issues?state=all&per_page=2`);
          
          if (commits && Array.isArray(commits)) {
            commits.forEach(commit => {
              // Safe access to commit data
              if (commit && commit.commit && commit.commit.committer) {
                activities.push({
                  type: 'commit',
                  project: project.label,
                  title: commit.commit.message || 'No commit message',
                  author: commit.commit.committer.name || 'Unknown',
                  date: new Date(commit.commit.committer.date || Date.now()),
                  url: commit.html_url || '#'
                });
              }
            });
          }

          if (issues && Array.isArray(issues)) {
            issues.forEach(issue => {
              // Safe access to issue data
              if (issue && issue.user) {
                activities.push({
                  type: issue.state === 'open' ? 'issue' : 'issue-closed',
                  project: project.label,
                  title: issue.title || 'No title',
                  author: issue.user.login || 'Unknown',
                  date: new Date(issue.updated_at || Date.now()),
                  url: issue.html_url || '#'
                });
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch activity for ${project.repo}:`, error);
        }
      }

      // Sort by date and limit to recent items
      activities.sort((a, b) => b.date - a.date);
      const recentActivities = activities.slice(0, 10);

      activityFeed.innerHTML = recentActivities.map(activity => `
        <div class="activity-item">
          <div class="activity-icon ${activity.type}">
            ${this.getActivityIcon(activity.type)}
          </div>
          <div class="activity-content">
            <div class="activity-title">
              <strong>${activity.project}</strong>: ${this.truncateText(activity.title, 60)}
            </div>
            <div class="activity-meta">
              ${activity.author} • ${this.timeAgo(activity.date)}
            </div>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  }

  getActivityIcon(type) {
    const icons = {
      'commit': '📝',
      'issue': '🐛',
      'issue-closed': '✅',
      'release': '🚀'
    };
    return icons[type] || '📋';
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  timeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  async fetchGitHubData(endpoint, retryCount = 0) {
    const cacheKey = endpoint;
    
    // Try to get data from localStorage first if API has been failing
    if (this.apiFailures.has(endpoint)) {
      const localData = this.loadFromLocalStorage();
      if (localData && localData[endpoint]) {
        console.info(`Using localStorage data for ${endpoint}`);
        return localData[endpoint];
      }
    }

    try {
      const response = await fetch(`https://api.github.com/${endpoint}`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (!response.ok) {
        this.apiFailures.add(endpoint);
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Remove from failures if successful
      this.apiFailures.delete(endpoint);
      
      // Save successful data to localStorage
      this.saveSuccessfulData(endpoint, data);
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        isMock: false
      });

      return data;
    } catch (error) {
      console.warn(`Failed to fetch ${endpoint}:`, error.message);
      
      // Track the failure
      this.apiFailures.add(endpoint);
      
      // Try localStorage first
      const localData = this.loadFromLocalStorage();
      if (localData && localData[endpoint]) {
        console.info(`Using localStorage fallback for ${endpoint}`);
        return localData[endpoint];
      }
      
      // Return mock data as last resort
      const mockData = this.getMockData(endpoint);
      if (mockData) {
        this.isUsingMockData = true;
        console.info(`Using mock data for ${endpoint}`);
      }
      
      return mockData;
    }
  }

  saveSuccessfulData(endpoint, data) {
    try {
      const existingData = this.loadFromLocalStorage() || {};
      existingData[endpoint] = data;
      this.saveToLocalStorage(existingData);
    } catch (error) {
      console.warn('Failed to save successful data:', error);
    }
  }

  checkApiStatus() {
    const statusIndicator = document.querySelector('[data-status]');
    const statusText = statusIndicator?.querySelector('.status-text');
    const statusDot = statusIndicator?.querySelector('.status-dot');
    
    if (statusText && statusDot) {
      // Check if we have real GitHub data or using fallback
      let hasRealData = false;
      let hasMockData = false;
      
      // Check cache for actual GitHub responses vs mock data
      for (let [key, value] of this.cache.entries()) {
        if (value.data) {
          if (value.isMock) {
            hasMockData = true;
          } else {
            hasRealData = true;
          }
        }
      }
      
      const failureCount = this.apiFailures.size;
      const totalRequests = this.cache.size;
      
      if (hasRealData && !hasMockData && failureCount === 0) {
        statusText.textContent = 'Live';
        statusIndicator.setAttribute('data-status', 'online');
        statusDot.style.background = '#28a745'; // Green - Live data
      } else if (hasRealData && hasMockData) {
        statusText.textContent = 'Mixed';
        statusIndicator.setAttribute('data-status', 'mixed'); 
        statusDot.style.background = '#fd7e14'; // Orange - Mixed data
      } else if (this.isUsingMockData || failureCount > 0) {
        statusText.textContent = 'Demo';
        statusIndicator.setAttribute('data-status', 'demo');
        statusDot.style.background = '#ffc107'; // Yellow - Demo mode
      } else {
        statusText.textContent = 'Loading...';
        statusIndicator.setAttribute('data-status', 'loading');
        statusDot.style.background = '#6c757d'; // Gray - Loading
      }
    }
  }

  getMockData(endpoint) {
    // Provide mock data when GitHub API is unavailable
    if (endpoint.includes('repos/divengine')) {
      const repoName = endpoint.split('/')[2];
      
      if (endpoint.includes('/commits')) {
        return [
          {
            sha: '1234567',
            commit: {
              message: 'Update documentation and examples',
              committer: { 
                name: 'divengine-dev', 
                date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() 
              }
            },
            html_url: `https://github.com/divengine/${repoName}/commit/1234567`
          },
          {
            sha: '2345678',
            commit: {
              message: 'Fix performance optimization',
              committer: { 
                name: 'divengine-dev', 
                date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString() 
              }
            },
            html_url: `https://github.com/divengine/${repoName}/commit/2345678`
          },
          {
            sha: '3456789',
            commit: {
              message: 'Add new features and improvements',
              committer: { 
                name: 'divengine-dev', 
                date: new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000).toISOString() 
              }
            },
            html_url: `https://github.com/divengine/${repoName}/commit/3456789`
          }
        ];
      }
      
      if (endpoint.includes('/issues')) {
        return [
          {
            number: 12,
            title: 'Enhancement: Add new feature',
            state: 'open',
            user: { login: 'divengine-dev' },
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
            html_url: `https://github.com/divengine/${repoName}/issues/12`
          },
          {
            number: 11,
            title: 'Bug: Fix compatibility issue',
            state: 'open',
            user: { login: 'contributor' },
            created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            html_url: `https://github.com/divengine/${repoName}/issues/11`
          }
        ];
      }
      
      // Default repository data with realistic random values
      const mockStats = {
        div: { stars: 45, forks: 12, issues: 3 },
        orm: { stars: 38, forks: 8, issues: 2 },
        nodes: { stars: 22, forks: 5, issues: 1 },
        ways: { stars: 31, forks: 7, issues: 2 },
        matrix: { stars: 19, forks: 4, issues: 1 },
        functions: { stars: 26, forks: 6, issues: 0 },
        ajaxmap: { stars: 42, forks: 11, issues: 4 }
      };
      
      const stats = mockStats[repoName] || { stars: 15, forks: 3, issues: 1 };
      
      return {
        name: repoName,
        full_name: `divengine/${repoName}`,
        description: `Mock data for ${repoName} project - Demo mode active`,
        stargazers_count: stats.stars,
        forks_count: stats.forks,
        open_issues_count: stats.issues,
        html_url: `https://github.com/divengine/${repoName}`,
        language: 'PHP',
        topics: ['php', 'divengine', 'open-source'],
        updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
    
    return null;
  }

  async refreshDashboard() {
    console.log('Manually refreshing dashboard...');
    
    // Clear cache to force fresh data
    this.cache.clear();
    this.apiFailures.clear();
    this.isUsingMockData = false;
    
    // Show refreshing indicator
    this.showNotification('Refreshing data...', 'info', 2000);
    
    // Refresh all components
    await Promise.all([
      this.loadStats(),
      this.loadProjects(),
      this.loadActivity()
    ]);

    // Update status indicator
    this.checkApiStatus();
    
    // Show completion notification
    if (this.isUsingMockData) {
      this.showNotification('GitHub API unavailable - using cached data', 'warning', 5000);
    } else {
      this.showNotification('Dashboard refreshed successfully', 'success', 3000);
    }
  }

  viewProject(slug) {
    // This could open a modal or navigate to project details
    console.log(`Viewing project: ${slug}`);
    
    // For now, just scroll to the project card
    const projectCard = document.querySelector(`[data-project="${slug}"]`);
    if (projectCard) {
      projectCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      projectCard.style.boxShadow = '0 0 20px rgba(0, 102, 204, 0.5)';
      setTimeout(() => {
        projectCard.style.boxShadow = '';
      }, 2000);
    }
  }

  showError(message) {
    const loadingOverlay = document.querySelector('[data-loading]');
    if (loadingOverlay) {
      loadingOverlay.innerHTML = `
        <div class="error-content">
          <h2>⚠️ Error Loading Dashboard</h2>
          <p>${message}</p>
          <button onclick="location.reload()" class="retry-button">Retry</button>
        </div>
      `;
    }
  }

  hideLoading() {
    const loadingOverlay = document.querySelector('[data-loading]');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }

  showNotification(message, type = 'info', duration = 3000) {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });
    
    // Auto remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  destroy() {
    // Cleanup if needed
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new DivenginedasDashboard();
});

// Handle beforeunload to cleanup
window.addEventListener('beforeunload', () => {
  if (window.dashboard) {
    window.dashboard.destroy();
  }
});

// Enhanced Code Display functionality
DivenginedasDashboard.prototype.currentProject = 'div';
DivenginedasDashboard.prototype.currentExampleIndex = 0;

DivenginedasDashboard.prototype.codeExamples = {
  div: {
    name: 'Template Engine',
    examples: [
      {
        title: 'Basic Template Rendering',
        lang: 'PHP',
        file: 'basic_usage.php',
        code: `<?php
// Divengine Template Engine - Basic Usage
use divengine\\div;

$data = [
    'user' => [
        'name' => 'John Doe',
        'active' => true,
        'lastLogin' => '2025-10-07 14:30:00'
    ]
];

$template = '
<div class="welcome">
    {if $user.active}
        <h1>Welcome {$user.name}!</h1>
        <p>Last login: {$user.lastLogin|date:"M j, Y"}</p>
    {else}
        <h1>Please activate your account</h1>
    {/if}
</div>';

echo div::render($template, $data);`
      },
      {
        title: 'Advanced Loops & Filters',
        lang: 'PHP',
        file: 'advanced_loops.php',
        code: `<?php
// Divengine Template Engine - Advanced Features
use divengine\\div;

$data = [
    'posts' => [
        ['title' => 'Getting Started', 'views' => 1250, 'category' => 'tutorial'],
        ['title' => 'Advanced Tips', 'views' => 890, 'category' => 'guide'],
        ['title' => 'Best Practices', 'views' => 2100, 'category' => 'tutorial']
    ],
    'categories' => ['tutorial', 'guide', 'news']
];

$template = '
<div class="blog">
    {loop $categories as $category}
        <section class="category-{$category}">
            <h2>{$category|capitalize}</h2>
            {loop $posts as $post}
                {if $post.category == $category}
                    <article>
                        <h3>{$post.title}</h3>
                        <span class="views">{$post.views|number} views</span>
                    </article>
                {/if}
            {/loop}
        </section>
    {/loop}
</div>';

echo div::render($template, $data);`
      },
      {
        title: 'Custom Filters & Functions',
        lang: 'PHP',
        file: 'custom_filters.php',
        code: `<?php
// Divengine Template Engine - Custom Filters
use divengine\\div;

// Register custom filters
div::addFilter('currency', function($value, $symbol = '$') {
    return $symbol . number_format($value, 2);
});

div::addFilter('excerpt', function($text, $length = 100) {
    return strlen($text) > $length ? 
        substr($text, 0, $length) . '...' : $text;
});

$data = [
    'products' => [
        ['name' => 'Laptop Pro', 'price' => 1299.99, 'description' => 'High-performance laptop with advanced features'],
        ['name' => 'Wireless Mouse', 'price' => 29.95, 'description' => 'Ergonomic wireless mouse with precision tracking']
    ]
];

$template = '
<div class="products">
    {loop $products as $product}
        <div class="product-card">
            <h3>{$product.name}</h3>
            <p class="price">{$product.price|currency:"€"}</p>
            <p class="description">{$product.description|excerpt:80}</p>
        </div>
    {/loop}
</div>';

echo div::render($template, $data);`
      }
    ]
  },
  orm: {
    name: 'Database ORM',
    examples: [
      {
        title: 'Model Definitions & Relations',
        lang: 'PHP',
        file: 'models.php',
        code: `<?php
// Divengine ORM - Model Definitions
use divengine\\orm\\Model;

class User extends Model {
    protected $table = 'users';
    protected $fillable = ['name', 'email', 'password', 'active'];
    protected $hidden = ['password'];
    protected $casts = [
        'active' => 'boolean',
        'created_at' => 'datetime'
    ];
    
    // Relationships
    public function posts() {
        return $this->hasMany(Post::class);
    }
    
    public function profile() {
        return $this->hasOne(UserProfile::class);
    }
    
    public function roles() {
        return $this->belongsToMany(Role::class, 'user_roles');
    }
}

class Post extends Model {
    protected $fillable = ['title', 'content', 'user_id', 'published'];
    
    public function user() {
        return $this->belongsTo(User::class);
    }
    
    public function comments() {
        return $this->hasMany(Comment::class);
    }
}`
      },
      {
        title: 'Query Builder & Scopes',
        lang: 'PHP',
        file: 'queries.php',
        code: `<?php
// Divengine ORM - Advanced Queries
use divengine\\orm\\Model;

class User extends Model {
    // Query scopes
    public function scopeActive($query) {
        return $query->where('active', true);
    }
    
    public function scopeWithPosts($query) {
        return $query->has('posts');
    }
    
    public function scopeRecent($query, $days = 30) {
        return $query->where('created_at', '>=', 
            now()->subDays($days));
    }
}

// Usage examples
$activeUsers = User::active()
    ->with(['posts', 'profile'])
    ->orderBy('last_login', 'desc')
    ->paginate(20);

$topAuthors = User::withPosts()
    ->withCount('posts')
    ->orderBy('posts_count', 'desc')
    ->limit(10)
    ->get();

$recentActiveUsers = User::active()
    ->recent(7)
    ->select(['id', 'name', 'email'])
    ->get();

// Complex queries
$userStats = User::selectRaw('
        COUNT(*) as total_users,
        COUNT(CASE WHEN active = 1 THEN 1 END) as active_users,
        AVG(DATEDIFF(NOW(), created_at)) as avg_age_days
    ')
    ->first();`
      },
      {
        title: 'Migrations & Schema',
        lang: 'PHP',
        file: 'migrations.php',
        code: `<?php
// Divengine ORM - Database Migrations
use divengine\\orm\\Migration;
use divengine\\orm\\Schema;

class CreateUsersTable extends Migration {
    public function up() {
        Schema::create('users', function($table) {
            $table->id();
            $table->string('name', 100);
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->boolean('active')->default(true);
            $table->timestamp('last_login')->nullable();
            $table->rememberToken();
            $table->timestamps();
            
            // Indexes
            $table->index(['active', 'created_at']);
            $table->index('last_login');
        });
    }
    
    public function down() {
        Schema::dropIfExists('users');
    }
}

class CreatePostsTable extends Migration {
    public function up() {
        Schema::create('posts', function($table) {
            $table->id();
            $table->string('title');
            $table->text('content');
            $table->string('slug')->unique();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->boolean('published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            
            $table->fullText(['title', 'content']);
        });
    }
}`
      }
    ]
  },
  nodes: {
    name: 'Graph Theory',
    examples: [
      {
        title: 'Graph Creation & Basic Operations',
        lang: 'PHP',
        file: 'basic_graph.php',
        code: `<?php
// Divengine Nodes - Basic Graph Operations
use divengine\\nodes\\Graph;
use divengine\\nodes\\Node;
use divengine\\nodes\\Edge;

// Create a social network graph
$socialNetwork = new Graph();

// Add users as nodes
$alice = new Node('alice', ['name' => 'Alice Johnson', 'age' => 28]);
$bob = new Node('bob', ['name' => 'Bob Smith', 'age' => 32]);
$carol = new Node('carol', ['name' => 'Carol Davis', 'age' => 25]);
$david = new Node('david', ['name' => 'David Wilson', 'age' => 30]);

$socialNetwork->addNode($alice);
$socialNetwork->addNode($bob);
$socialNetwork->addNode($carol);
$socialNetwork->addNode($david);

// Add friendships as edges
$socialNetwork->addEdge($alice, $bob, ['relationship' => 'friend', 'since' => '2020-01-15']);
$socialNetwork->addEdge($alice, $carol, ['relationship' => 'friend', 'since' => '2021-03-22']);
$socialNetwork->addEdge($bob, $david, ['relationship' => 'colleague', 'since' => '2019-08-10']);
$socialNetwork->addEdge($carol, $david, ['relationship' => 'friend', 'since' => '2022-01-05']);

// Basic operations
echo "Network has " . $socialNetwork->getNodeCount() . " users\\n";
echo "Network has " . $socialNetwork->getEdgeCount() . " connections\\n";

// Find all friends of Alice
$aliceFriends = $socialNetwork->getNeighbors($alice);
foreach ($aliceFriends as $friend) {
    echo "Alice is connected to: " . $friend->getData()['name'] . "\\n";
}`
      },
      {
        title: 'Pathfinding Algorithms',
        lang: 'PHP',
        file: 'pathfinding.php',
        code: `<?php
// Divengine Nodes - Advanced Pathfinding
use divengine\\nodes\\Graph;
use divengine\\nodes\\algorithms\\Dijkstra;
use divengine\\nodes\\algorithms\\AStar;

// Create a weighted graph (city distances)
$cityGraph = new Graph();

$cities = [
    'NYC' => new Node('NYC', ['name' => 'New York', 'lat' => 40.7128, 'lng' => -74.0060]),
    'LA' => new Node('LA', ['name' => 'Los Angeles', 'lat' => 34.0522, 'lng' => -118.2437]),
    'CHI' => new Node('CHI', ['name' => 'Chicago', 'lat' => 41.8781, 'lng' => -87.6298]),
    'MIA' => new Node('MIA', ['name' => 'Miami', 'lat' => 25.7617, 'lng' => -80.1918])
];

foreach ($cities as $city) {
    $cityGraph->addNode($city);
}

// Add weighted edges (distances in miles)
$cityGraph->addWeightedEdge($cities['NYC'], $cities['CHI'], 790);
$cityGraph->addWeightedEdge($cities['NYC'], $cities['MIA'], 1280);
$cityGraph->addWeightedEdge($cities['CHI'], $cities['LA'], 2015);
$cityGraph->addWeightedEdge($cities['MIA'], $cities['LA'], 2340);
$cityGraph->addWeightedEdge($cities['NYC'], $cities['LA'], 2445);

// Find shortest path using Dijkstra
$dijkstra = new Dijkstra($cityGraph);
$shortestPath = $dijkstra->findPath($cities['NYC'], $cities['LA']);

echo "Shortest path from NYC to LA:\\n";
foreach ($shortestPath['path'] as $city) {
    echo "-> " . $city->getData()['name'] . "\\n";
}
echo "Total distance: " . $shortestPath['distance'] . " miles\\n";

// Use A* with heuristic (great circle distance)
$aStar = new AStar($cityGraph);
$aStar->setHeuristic(function($node, $goal) {
    return $this->calculateDistance(
        $node->getData()['lat'], $node->getData()['lng'],
        $goal->getData()['lat'], $goal->getData()['lng']
    );
});

$aStarPath = $aStar->findPath($cities['NYC'], $cities['LA']);`
      },
      {
        title: 'Network Analysis & Clustering',
        lang: 'PHP',
        file: 'network_analysis.php',
        code: `<?php
// Divengine Nodes - Network Analysis
use divengine\\nodes\\Graph;
use divengine\\nodes\\analysis\\CentralityMeasures;
use divengine\\nodes\\analysis\\CommunityDetection;

class SocialNetworkAnalyzer {
    private $graph;
    private $centrality;
    private $clustering;
    
    public function __construct(Graph $graph) {
        $this->graph = $graph;
        $this->centrality = new CentralityMeasures($graph);
        $this->clustering = new CommunityDetection($graph);
    }
    
    public function analyzeInfluence() {
        // Calculate different centrality measures
        $betweenness = $this->centrality->betweennessCentrality();
        $closeness = $this->centrality->closenessCentrality();
        $degree = $this->centrality->degreeCentrality();
        $pagerank = $this->centrality->pageRank();
        
        $influencers = [];
        foreach ($this->graph->getNodes() as $node) {
            $nodeId = $node->getId();
            $influencers[$nodeId] = [
                'name' => $node->getData()['name'],
                'betweenness' => $betweenness[$nodeId] ?? 0,
                'closeness' => $closeness[$nodeId] ?? 0,
                'degree' => $degree[$nodeId] ?? 0,
                'pagerank' => $pagerank[$nodeId] ?? 0
            ];
        }
        
        // Sort by PageRank score
        uasort($influencers, fn($a, $b) => $b['pagerank'] <=> $a['pagerank']);
        
        return $influencers;
    }
    
    public function detectCommunities() {
        // Use modularity-based community detection
        $communities = $this->clustering->louvainMethod();
        
        $result = [];
        foreach ($communities as $communityId => $nodes) {
            $result[$communityId] = [
                'size' => count($nodes),
                'members' => array_map(fn($node) => $node->getData()['name'], $nodes),
                'density' => $this->calculateCommunityDensity($nodes)
            ];
        }
        
        return $result;
    }
}`
      }
    ]
  },
  ways: {
    name: 'Routing System',
    examples: [
      {
        title: 'Basic Route Definition',
        lang: 'PHP',
        file: 'basic_routes.php',
        code: `<?php
// Divengine Ways - Basic Routing
use divengine\\ways\\Router;

$router = new Router();

// Simple GET route
$router->get('/', function() {
    return 'Welcome to Divengine!';
});

// Route with parameter
$router->get('/user/{id}', function($id) {
    return "User ID: " . $id;
});

// Route with optional parameter
$router->get('/posts/{id?}', function($id = null) {
    return $id ? "Post: $id" : "All posts";
});

// POST route
$router->post('/users', 'UserController@store');

// Route with constraints
$router->get('/user/{id}', 'UserController@show')
      ->where('id', '[0-9]+');

// Named routes
$router->get('/dashboard', 'DashboardController@index')
      ->name('dashboard');

// Dispatch the request
$response = $router->dispatch($_SERVER['REQUEST_URI']);
echo $response;`
      },
      {
        title: 'Route Groups & Middleware',
        lang: 'PHP',
        file: 'advanced_routing.php',
        code: `<?php
// Divengine Ways - Advanced Routing Features
use divengine\\ways\\Router;

$router = new Router();

// Route groups with shared attributes
$router->group(['prefix' => 'api/v1', 'middleware' => 'api'], function($router) {
    
    // Authentication required routes
    $router->group(['middleware' => 'auth'], function($router) {
        $router->get('/profile', 'ProfileController@show');
        $router->put('/profile', 'ProfileController@update');
        $router->delete('/account', 'AccountController@destroy');
    });
    
    // Admin only routes
    $router->group(['middleware' => ['auth', 'admin']], function($router) {
        $router->resource('/users', 'UserController');
        $router->get('/analytics', 'AnalyticsController@index');
    });
    
    // Public API routes
    $router->get('/status', function() {
        return json_encode(['status' => 'ok', 'timestamp' => time()]);
    });
});

// Web routes with different middleware
$router->group(['middleware' => 'web'], function($router) {
    $router->get('/login', 'AuthController@showLogin')->name('login');
    $router->post('/login', 'AuthController@login');
    $router->post('/logout', 'AuthController@logout')->name('logout');
    
    // Protected web routes
    $router->group(['middleware' => 'auth'], function($router) {
        $router->get('/dashboard', 'DashboardController@index');
        $router->resource('/posts', 'PostController');
    });
});`
      },
      {
        title: 'RESTful Resources',
        lang: 'PHP',
        file: 'restful_resources.php',
        code: `<?php
// Divengine Ways - RESTful Resource Routing
use divengine\\ways\\Router;

$router = new Router();

// Full resource routes (generates 7 routes)
$router->resource('/posts', 'PostController');
/*
 * Generates:
 * GET    /posts           -> PostController@index
 * GET    /posts/create    -> PostController@create  
 * POST   /posts           -> PostController@store
 * GET    /posts/{id}      -> PostController@show
 * GET    /posts/{id}/edit -> PostController@edit
 * PUT    /posts/{id}      -> PostController@update
 * DELETE /posts/{id}      -> PostController@destroy
 */

// Partial resource (only specific actions)
$router->resource('/comments', 'CommentController')
       ->only(['index', 'store', 'show', 'destroy']);

// Exclude certain actions
$router->resource('/categories', 'CategoryController')
       ->except(['create', 'edit']);

// Nested resources
$router->resource('/posts.comments', 'PostCommentController');
/*
 * Generates nested routes like:
 * GET /posts/{post}/comments
 * POST /posts/{post}/comments  
 * GET /posts/{post}/comments/{comment}
 * etc.
 */

// API resource (no create/edit forms)
$router->apiResource('/api/articles', 'ArticleController');

// Custom resource routes
$router->resource('/users', 'UserController', function($router) {
    $router->get('/profile', 'UserController@profile');
    $router->post('/avatar', 'UserController@uploadAvatar');
});`
      }
    ]
  },
  matrix: {
    name: 'Data Structure',
    examples: [
      {
        title: 'Basic Matrix Operations',
        lang: 'PHP',
        file: 'basic_matrix.php',
        code: `<?php
// Divengine Matrix - Basic Operations
use divengine\\matrix\\Matrix;

// Create matrices
$A = new Matrix([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]);

$B = new Matrix([
    [9, 8, 7],
    [6, 5, 4],
    [3, 2, 1]
]);

// Basic arithmetic operations
$sum = $A->add($B);
$difference = $A->subtract($B);
$product = $A->multiply($B);

echo "Matrix A:\\n" . $A->toString() . "\\n";
echo "Matrix B:\\n" . $B->toString() . "\\n";
echo "A + B:\\n" . $sum->toString() . "\\n";
echo "A - B:\\n" . $difference->toString() . "\\n";
echo "A × B:\\n" . $product->toString() . "\\n";

// Matrix properties
echo "A dimensions: " . $A->getRows() . "×" . $A->getCols() . "\\n";
echo "A determinant: " . $A->determinant() . "\\n";
echo "A trace: " . $A->trace() . "\\n";

// Matrix transformations
$transposed = $A->transpose();
$inverse = $A->inverse();

echo "A transposed:\\n" . $transposed->toString() . "\\n";
echo "A inverse:\\n" . $inverse->toString() . "\\n";

// Verify inverse: A × A^(-1) = I
$identity = $A->multiply($inverse);
echo "A × A^(-1):\\n" . $identity->toString() . "\\n";`
      },
      {
        title: 'Statistical Analysis',
        lang: 'PHP',
        file: 'statistics.php',
        code: `<?php
// Divengine Matrix - Statistical Analysis
use divengine\\matrix\\Matrix;
use divengine\\matrix\\Statistics;

// Sample dataset (student scores)
$scores = new Matrix([
    [85, 92, 78, 88, 95],  // Math scores
    [79, 85, 82, 90, 87],  // Science scores  
    [88, 91, 85, 85, 92],  // English scores
    [82, 89, 80, 87, 90]   // History scores
]);

$stats = new Statistics($scores);

// Descriptive statistics
$means = $stats->mean();  // Mean for each subject
$medians = $stats->median();
$modes = $stats->mode();
$stdDevs = $stats->standardDeviation();
$variances = $stats->variance();

echo "Subject Statistics:\\n";
$subjects = ['Math', 'Science', 'English', 'History'];
foreach ($subjects as $i => $subject) {
    echo "$subject - Mean: {$means[$i]}, Std Dev: {$stdDevs[$i]}\\n";
}

// Correlation analysis
$correlationMatrix = $stats->correlationMatrix();
echo "\\nCorrelation Matrix:\\n" . $correlationMatrix->toString() . "\\n";

// Find strongest correlations
$correlations = [];
for ($i = 0; $i < count($subjects); $i++) {
    for ($j = $i + 1; $j < count($subjects); $j++) {
        $corr = $correlationMatrix->get($i, $j);
        $correlations[] = [
            'subjects' => [$subjects[$i], $subjects[$j]],
            'correlation' => $corr
        ];
    }
}

// Sort by correlation strength
usort($correlations, fn($a, $b) => abs($b['correlation']) <=> abs($a['correlation']));

echo "\\nStrongest Correlations:\\n";
foreach (array_slice($correlations, 0, 3) as $corr) {
    echo "{$corr['subjects'][0]} - {$corr['subjects'][1]}: {$corr['correlation']}\\n";
}`
      },
      {
        title: 'Machine Learning Applications',
        lang: 'PHP',
        file: 'machine_learning.php',
        code: `<?php
// Divengine Matrix - Machine Learning
use divengine\\matrix\\Matrix;
use divengine\\matrix\\ml\\LinearRegression;
use divengine\\matrix\\ml\\PCA;

// House price prediction dataset
$features = new Matrix([
    [1500, 3, 2, 10],  // sqft, bedrooms, bathrooms, age
    [2000, 4, 3, 5],
    [1200, 2, 1, 15],
    [1800, 3, 2, 8],
    [2500, 5, 4, 2],
    [1000, 2, 1, 20],
    [2200, 4, 3, 3]
]);

$prices = [300000, 400000, 250000, 350000, 500000, 200000, 450000];

// Linear regression
$regression = new LinearRegression();
$model = $regression->fit($features, $prices);

// Make predictions
$newHouse = new Matrix([[1600, 3, 2, 7]]);
$predictedPrice = $regression->predict($newHouse);

echo "Predicted price for 1600 sqft house: $" . number_format($predictedPrice[0]) . "\\n";

// Model evaluation
$r2Score = $regression->score($features, $prices);
echo "Model R² Score: " . round($r2Score, 4) . "\\n";

// Feature importance
$coefficients = $model->getCoefficients();
$featureNames = ['Square Feet', 'Bedrooms', 'Bathrooms', 'Age'];

echo "\\nFeature Importance:\\n";
foreach ($featureNames as $i => $name) {
    echo "$name: " . round($coefficients[$i], 2) . "\\n";
}

// Principal Component Analysis for dimensionality reduction
$pca = new PCA($features);
$components = $pca->fitTransform(2); // Reduce to 2 dimensions

echo "\\nPCA Results:\\n";
echo "Original dimensions: " . $features->getCols() . "\\n";
echo "Reduced dimensions: " . $components->getCols() . "\\n";
echo "Explained variance ratio: " . implode(', ', $pca->getExplainedVarianceRatio()) . "\\n";`
      }
    ]
  },
  functions: {
    name: 'Utility Functions',
    examples: [
      {
        title: 'Functional Programming',
        lang: 'PHP',
        file: 'functional.php',
        code: `<?php
// Divengine Functions - Functional Programming
use divengine\\functions as fn;

// Sample data
$users = [
    ['id' => 1, 'name' => 'Alice', 'age' => 25, 'city' => 'NYC', 'active' => true],
    ['id' => 2, 'name' => 'Bob', 'age' => 30, 'city' => 'LA', 'active' => true],
    ['id' => 3, 'name' => 'Carol', 'age' => 22, 'city' => 'NYC', 'active' => false],
    ['id' => 4, 'name' => 'David', 'age' => 35, 'city' => 'Chicago', 'active' => true]
];

// Function composition and chaining
$activeNYCUsers = fn::pipe($users)
    ->filter(fn::where('active', true))
    ->filter(fn::where('city', 'NYC'))
    ->map(fn::pick(['name', 'age']))
    ->values();

print_r($activeNYCUsers);
// Output: [['name' => 'Alice', 'age' => 25]]

// Advanced filtering and mapping
$processedUsers = fn::pipe($users)
    ->filter(fn::where('age', '>=', 25))
    ->map(function($user) {
        return array_merge($user, [
            'display_name' => fn::capitalize($user['name']),
            'age_group' => $user['age'] < 30 ? 'young' : 'mature',
            'location' => fn::titleCase($user['city'])
        ]);
    })
    ->groupBy('age_group')
    ->mapValues(fn::pluck('display_name'))
    ->toArray();

print_r($processedUsers);

// Reduce operations
$statistics = fn::reduce($users, function($acc, $user) {
    $acc['total']++;
    $acc['total_age'] += $user['age'];
    $acc['cities'][$user['city']] = ($acc['cities'][$user['city']] ?? 0) + 1;
    if ($user['active']) $acc['active']++;
    return $acc;
}, ['total' => 0, 'total_age' => 0, 'active' => 0, 'cities' => []]);

$statistics['average_age'] = $statistics['total_age'] / $statistics['total'];
print_r($statistics);`
      },
      {
        title: 'Array Utilities',
        lang: 'PHP',
        file: 'array_utils.php',
        code: `<?php
// Divengine Functions - Array Utilities
use divengine\\functions as fn;

// Sample e-commerce data
$orders = [
    ['id' => 1, 'customer' => 'Alice', 'amount' => 150.00, 'status' => 'completed', 'date' => '2025-10-01'],
    ['id' => 2, 'customer' => 'Bob', 'amount' => 89.99, 'status' => 'pending', 'date' => '2025-10-02'],
    ['id' => 3, 'customer' => 'Alice', 'amount' => 220.50, 'status' => 'completed', 'date' => '2025-10-03'],
    ['id' => 4, 'customer' => 'Carol', 'amount' => 45.00, 'status' => 'cancelled', 'date' => '2025-10-04'],
    ['id' => 5, 'customer' => 'Bob', 'amount' => 310.25, 'status' => 'completed', 'date' => '2025-10-05']
];

// Deep array operations
$nested = [
    'users' => [
        ['profile' => ['settings' => ['theme' => 'dark', 'notifications' => true]]],
        ['profile' => ['settings' => ['theme' => 'light', 'notifications' => false]]]
    ]
];

// Extract deeply nested values
$themes = fn::pluckDeep($nested, 'users.*.profile.settings.theme');
print_r($themes); // ['dark', 'light']

// Set deeply nested values
$updated = fn::setDeep($nested, 'users.0.profile.settings.language', 'en');

// Array flattening and restructuring
$flatOrders = fn::flatten($orders, '.');
$restructured = fn::unflatten($flatOrders, '.');

// Custom sorting and grouping
$topCustomers = fn::pipe($orders)
    ->filter(fn::where('status', 'completed'))
    ->groupBy('customer')
    ->mapValues(function($customerOrders) {
        return [
            'total_orders' => count($customerOrders),
            'total_amount' => fn::sum(fn::pluck($customerOrders, 'amount')),
            'average_order' => fn::average(fn::pluck($customerOrders, 'amount'))
        ];
    })
    ->sortBy(fn::desc('total_amount'))
    ->take(3)
    ->toArray();

print_r($topCustomers);

// Array validation and transformation
$validated = fn::pipe($orders)
    ->map(fn::validate([
        'amount' => 'numeric|min:0',
        'status' => 'in:pending,completed,cancelled',
        'customer' => 'string|required'
    ]))
    ->filter(fn::get('valid'))
    ->map(fn::get('data'))
    ->values();`
      },
      {
        title: 'String & Date Utilities',
        lang: 'PHP',
        file: 'string_date_utils.php',
        code: `<?php
// Divengine Functions - String & Date Utilities
use divengine\\functions as fn;

// String manipulation
$text = "  Hello World! This is a SAMPLE text.  ";

$processed = [
    'original' => $text,
    'trimmed' => fn::trim($text),
    'slug' => fn::slug($text),
    'camelCase' => fn::camelCase($text),
    'snakeCase' => fn::snakeCase($text),
    'titleCase' => fn::titleCase($text),
    'words' => fn::words($text),
    'wordCount' => fn::wordCount($text),
    'excerpt' => fn::excerpt($text, 20),
    'truncate' => fn::truncate($text, 15, '...')
];

print_r($processed);

// Advanced string operations
$html = '<p>Hello <strong>World</strong>!</p>';
$markdown = '# Hello\\n\\nThis is **bold** text.';

$stringOps = [
    'stripTags' => fn::stripTags($html),
    'htmlToText' => fn::htmlToText($html),
    'markdownToHtml' => fn::markdownToHtml($markdown),
    'sanitize' => fn::sanitize('<script>alert("xss")</script>Hello'),
    'highlight' => fn::highlight('Hello World', 'World', '<mark>', '</mark>')
];

print_r($stringOps);

// Date and time utilities
$dates = [
    '2025-10-01 10:30:00',
    '2025-09-15 14:45:00', 
    '2025-10-07 09:00:00',
    '2025-08-20 16:20:00'
];

$dateOperations = fn::pipe($dates)
    ->map(fn::toDate())
    ->map(function($date) {
        return [
            'original' => $date->format('Y-m-d H:i:s'),
            'humanTime' => fn::timeAgo($date),
            'dayOfWeek' => fn::dayName($date),
            'isWeekend' => fn::isWeekend($date),
            'quarter' => fn::quarter($date),
            'formatted' => fn::formatDate($date, 'M j, Y \\\\a\\\\t g:i A')
        ];
    })
    ->values();

print_r($dateOperations);

// Business date calculations
$businessDays = fn::addBusinessDays(fn::now(), 5);
$workingHours = fn::getWorkingHours('2025-10-07', '09:00', '17:00');
$isHoliday = fn::isHoliday('2025-12-25', 'US');

echo "5 business days from now: " . $businessDays->format('Y-m-d') . "\\n";
echo "Working hours today: $workingHours hours\\n";
echo "Is Christmas a holiday? " . ($isHoliday ? 'Yes' : 'No') . "\\n";`
      }
    ]
  },
  ajaxmap: {
    name: 'Interactive Maps',
    examples: [
      {
        title: 'Basic Map Setup',
        lang: 'JavaScript',
        file: 'basic_map.js',
        code: `// Divengine AjaxMap - Basic Map Setup
import { AjaxMap, Marker, Layer } from 'divengine-ajaxmap';

class BasicMapDemo {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.init();
    }
    
    async init() {
        // Initialize map with options
        this.map = new AjaxMap('map-container', {
            center: [40.7128, -74.0060], // NYC coordinates
            zoom: 12,
            style: 'streets',
            controls: {
                zoom: true,
                navigation: true,
                fullscreen: true,
                layers: true
            },
            theme: 'dark'
        });
        
        // Wait for map to load
        await this.map.ready();
        
        // Add some basic markers
        this.addSampleMarkers();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        console.log('Map initialized successfully!');
    }
    
    addSampleMarkers() {
        const locations = [
            { id: 1, name: 'Times Square', lat: 40.7580, lng: -73.9855, type: 'landmark' },
            { id: 2, name: 'Central Park', lat: 40.7829, lng: -73.9654, type: 'park' },
            { id: 3, name: 'Brooklyn Bridge', lat: 40.7061, lng: -73.9969, type: 'landmark' },
            { id: 4, name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, type: 'monument' }
        ];
        
        locations.forEach(location => {
            const marker = new Marker({
                position: [location.lat, location.lng],
                title: location.name,
                popup: this.createPopupContent(location),
                icon: this.getIconForType(location.type),
                draggable: false
            });
            
            this.map.addMarker(marker);
            this.markers.set(location.id, marker);
        });
    }
    
    createPopupContent(location) {
        return \`
            <div class="map-popup">
                <h3>\${location.name}</h3>
                <p>Type: \${location.type}</p>
                <p>Coordinates: \${location.lat.toFixed(4)}, \${location.lng.toFixed(4)}</p>
                <button onclick="showDetails(\${location.id})">More Info</button>
            </div>
        \`;
    }
    
    getIconForType(type) {
        const icons = {
            landmark: '🏛️',
            park: '🌳', 
            monument: '🗽',
            default: '📍'
        };
        return icons[type] || icons.default;
    }
}`
      },
      {
        title: 'Real-time Data Integration',
        lang: 'JavaScript',
        file: 'realtime_data.js',
        code: `// Divengine AjaxMap - Real-time Data Integration
import { AjaxMap, HeatmapLayer, ClusterLayer } from 'divengine-ajaxmap';

class RealTimeMapDemo {
    constructor() {
        this.map = null;
        this.websocket = null;
        this.dataLayers = new Map();
        this.updateInterval = null;
        this.init();
    }
    
    async init() {
        this.map = new AjaxMap('realtime-map', {
            center: [37.7749, -122.4194], // San Francisco
            zoom: 11,
            style: 'satellite'
        });
        
        await this.map.ready();
        
        // Set up real-time data sources
        this.setupWebSocket();
        this.setupPeriodicUpdates();
        this.createDataLayers();
    }
    
    setupWebSocket() {
        this.websocket = new WebSocket('wss://api.example.com/realtime');
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleRealtimeUpdate(data);
        };
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected for real-time updates');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Fallback to polling
            this.setupPeriodicUpdates();
        };
    }
    
    setupPeriodicUpdates() {
        // Fallback: Poll for updates every 30 seconds
        this.updateInterval = setInterval(() => {
            this.fetchLatestData();
        }, 30000);
    }
    
    async createDataLayers() {
        // Traffic heatmap layer
        const trafficLayer = new HeatmapLayer({
            id: 'traffic',
            data: await this.fetchTrafficData(),
            options: {
                radius: 20,
                maxZoom: 15,
                gradient: {
                    0.0: 'green',
                    0.5: 'yellow', 
                    1.0: 'red'
                }
            }
        });
        
        // Incident cluster layer
        const incidentLayer = new ClusterLayer({
            id: 'incidents',
            data: await this.fetchIncidentData(),
            clusterRadius: 50,
            maxClusterRadius: 100
        });
        
        this.map.addLayer(trafficLayer);
        this.map.addLayer(incidentLayer);
        
        this.dataLayers.set('traffic', trafficLayer);
        this.dataLayers.set('incidents', incidentLayer);
    }
    
    handleRealtimeUpdate(data) {
        switch (data.type) {
            case 'traffic_update':
                this.updateTrafficData(data.payload);
                break;
            case 'new_incident':
                this.addIncident(data.payload);
                break;
            case 'incident_resolved':
                this.removeIncident(data.payload.id);
                break;
            case 'vehicle_position':
                this.updateVehiclePosition(data.payload);
                break;
        }
    }
    
    async fetchLatestData() {
        try {
            const [traffic, incidents] = await Promise.all([
                fetch('/api/traffic/current').then(r => r.json()),
                fetch('/api/incidents/active').then(r => r.json())
            ]);
            
            this.updateTrafficData(traffic);
            this.updateIncidentData(incidents);
            
        } catch (error) {
            console.error('Error fetching latest data:', error);
        }
    }
    
    updateTrafficData(trafficData) {
        const trafficLayer = this.dataLayers.get('traffic');
        if (trafficLayer) {
            trafficLayer.setData(trafficData.map(point => ({
                lat: point.latitude,
                lng: point.longitude,
                intensity: point.congestion_level
            })));
        }
    }
}`
      },
      {
        title: 'Interactive Features & Controls',
        lang: 'JavaScript',
        file: 'interactive_features.js',
        code: `// Divengine AjaxMap - Interactive Features
import { AjaxMap, DrawingTools, MeasurementTool, GeofenceManager } from 'divengine-ajaxmap';

class InteractiveMapDemo {
    constructor() {
        this.map = null;
        this.drawingTools = null;
        this.measurementTool = null;
        this.geofences = null;
        this.init();
    }
    
    async init() {
        this.map = new AjaxMap('interactive-map', {
            center: [51.5074, -0.1278], // London
            zoom: 10,
            controls: {
                drawing: true,
                measurement: true,
                search: true,
                layers: true
            }
        });
        
        await this.map.ready();
        
        this.setupDrawingTools();
        this.setupMeasurementTools();
        this.setupGeofencing();
        this.setupSearchFunctionality();
        this.setupCustomControls();
    }
    
    setupDrawingTools() {
        this.drawingTools = new DrawingTools(this.map, {
            tools: ['marker', 'polyline', 'polygon', 'rectangle', 'circle'],
            styles: {
                stroke: { color: '#3388ff', weight: 3 },
                fill: { color: '#3388ff', opacity: 0.2 }
            }
        });
        
        // Handle drawing events
        this.drawingTools.on('draw:created', (event) => {
            const layer = event.layer;
            const type = event.layerType;
            
            console.log(\`Created \${type}:\`, layer);
            
            // Add popup to drawn features
            if (type === 'polygon' || type === 'rectangle') {
                const area = this.calculateArea(layer);
                layer.bindPopup(\`Area: \${area.toFixed(2)} km²\`);
            } else if (type === 'polyline') {
                const distance = this.calculateDistance(layer);
                layer.bindPopup(\`Distance: \${distance.toFixed(2)} km\`);
            }
            
            // Save to backend
            this.saveDrawnFeature(layer, type);
        });
        
        this.drawingTools.on('draw:edited', (event) => {
            event.layers.eachLayer((layer) => {
                console.log('Edited layer:', layer);
                this.updateDrawnFeature(layer);
            });
        });
    }
    
    setupMeasurementTools() {
        this.measurementTool = new MeasurementTool(this.map, {
            units: 'metric',
            showTooltip: true,
            continueDrawing: false
        });
        
        this.measurementTool.on('measurement:complete', (event) => {
            const measurement = event.measurement;
            console.log('Measurement result:', measurement);
            
            // Display results in custom panel
            this.displayMeasurementResult(measurement);
        });
    }
    
    setupGeofencing() {
        this.geofences = new GeofenceManager(this.map);
        
        // Create sample geofences
        const zones = [
            {
                id: 'zone1',
                name: 'Restricted Area',
                coordinates: [[51.5074, -0.1278], [51.5174, -0.1178], [51.5074, -0.1078]],
                type: 'restricted',
                alerts: true
            },
            {
                id: 'zone2', 
                name: 'Safe Zone',
                center: [51.5074, -0.1278],
                radius: 1000,
                type: 'safe',
                alerts: false
            }
        ];
        
        zones.forEach(zone => this.geofences.addZone(zone));
        
        // Handle geofence events
        this.geofences.on('enter', (event) => {
            console.log(\`Entered geofence: \${event.zone.name}\`);
            this.showNotification(\`Entered \${event.zone.name}\`, 'info');
        });
        
        this.geofences.on('exit', (event) => {
            console.log(\`Exited geofence: \${event.zone.name}\`);
            this.showNotification(\`Exited \${event.zone.name}\`, 'warning');
        });
    }
    
    setupCustomControls() {
        // Add custom layer toggle control
        const layerControl = this.map.createCustomControl({
            position: 'topright',
            className: 'layer-control',
            content: \`
                <div class="control-panel">
                    <h4>Map Layers</h4>
                    <label><input type="checkbox" id="traffic-layer" checked> Traffic</label>
                    <label><input type="checkbox" id="satellite-layer"> Satellite</label>
                    <label><input type="checkbox" id="terrain-layer"> Terrain</label>
                </div>
            \`
        });
        
        // Handle layer toggles
        layerControl.addEventListener('change', (event) => {
            const layerId = event.target.id.replace('-layer', '');
            const isEnabled = event.target.checked;
            
            this.toggleLayer(layerId, isEnabled);
        });
    }
}`
      }
    ]
  }
};

DivenginedasDashboard.prototype.initCodeDisplay = function() {
  const prevButton = document.querySelector('[data-example-prev]');
  const nextButton = document.querySelector('[data-example-next]');
  const copyButton = document.querySelector('[data-code-copy]');
  
  // Set initial code display
  this.updateCodeDisplay();
  
  // Handle navigation buttons
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      this.navigateExample(-1);
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      this.navigateExample(1);
    });
  }
  
  // Handle copy button
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      const codeContent = document.querySelector('[data-code-content]');
      if (codeContent) {
        navigator.clipboard.writeText(codeContent.textContent.replace(/^\s*|\s*$/g, ''));
        copyButton.textContent = 'Copied!';
        setTimeout(() => copyButton.textContent = 'Copy', 2000);
      }
    });
  }
  
  // Set up project card click handlers
  this.setupProjectInteraction();
};

DivenginedasDashboard.prototype.navigateExample = function(direction) {
  const projectData = this.codeExamples[this.currentProject];
  if (!projectData || !projectData.examples) return;
  
  const maxIndex = projectData.examples.length - 1;
  this.currentExampleIndex += direction;
  
  // Wrap around
  if (this.currentExampleIndex > maxIndex) {
    this.currentExampleIndex = 0;
  } else if (this.currentExampleIndex < 0) {
    this.currentExampleIndex = maxIndex;
  }
  
  this.updateCodeDisplay();
};

DivenginedasDashboard.prototype.switchToProject = function(projectKey) {
  if (this.codeExamples[projectKey]) {
    this.currentProject = projectKey;
    this.currentExampleIndex = 0;
    this.updateCodeDisplay();
  }
};

DivenginedasDashboard.prototype.setupProjectInteraction = function() {
  // Listen for project card interactions
  document.addEventListener('click', (e) => {
    const projectCard = e.target.closest('[data-project]');
    if (projectCard) {
      const projectSlug = projectCard.getAttribute('data-project');
      // Map project slugs to code example keys
      const projectMap = {
        'div': 'div',
        'orm': 'orm', 
        'nodes': 'nodes',
        'ways': 'ways',
        'matrix': 'matrix',
        'functions': 'functions',
        'ajaxmap': 'ajaxmap'
      };
      
      if (projectMap[projectSlug]) {
        this.switchToProject(projectMap[projectSlug]);
        
        // Visual feedback
        this.highlightProject(projectCard);
      }
    }
  });
};

DivenginedasDashboard.prototype.highlightProject = function(projectCard) {
  // Remove previous highlights
  document.querySelectorAll('.project-card').forEach(card => {
    card.classList.remove('code-selected');
  });
  
  // Highlight selected project
  projectCard.classList.add('code-selected');
  
  // Auto-remove highlight after animation
  setTimeout(() => {
    projectCard.classList.remove('code-selected');
  }, 3000);
};

DivenginedasDashboard.prototype.updateCodeDisplay = function() {
  const projectData = this.codeExamples[this.currentProject];
  if (!projectData || !projectData.examples) return;
  
  const currentExample = projectData.examples[this.currentExampleIndex];
  if (!currentExample) return;
  
  // Update UI elements
  const elements = {
    projectIndicator: document.querySelector('.current-project'),
    exampleCounter: document.querySelector('[data-example-counter]'),
    exampleTitle: document.querySelector('[data-example-title]'),
    codeContent: document.querySelector('[data-code-content]'),
    codeLang: document.querySelector('.code-lang'),
    codeFile: document.querySelector('.code-file'),
    prevButton: document.querySelector('[data-example-prev]'),
    nextButton: document.querySelector('[data-example-next]')
  };
  
  // Update content
  if (elements.projectIndicator) {
    elements.projectIndicator.textContent = this.currentProject;
  }
  
  if (elements.exampleCounter) {
    elements.exampleCounter.textContent = `${this.currentExampleIndex + 1} / ${projectData.examples.length}`;
  }
  
  if (elements.exampleTitle) {
    elements.exampleTitle.textContent = currentExample.title;
  }
  
  if (elements.codeContent) {
    elements.codeContent.innerHTML = `<code>${this.syntaxHighlight(currentExample.code)}</code>`;
    // Trigger typewriter animation
    elements.codeContent.style.animation = 'none';
    elements.codeContent.offsetHeight; // Trigger reflow
    elements.codeContent.style.animation = 'code-typewriter 1s ease-out';
  }
  
  if (elements.codeLang) {
    elements.codeLang.textContent = currentExample.lang;
  }
  
  if (elements.codeFile) {
    elements.codeFile.textContent = currentExample.file;
  }
  
  // Update navigation buttons
  const isFirst = this.currentExampleIndex === 0;
  const isLast = this.currentExampleIndex === projectData.examples.length - 1;
  
  if (elements.prevButton) {
    elements.prevButton.disabled = false; // Allow wrapping
  }
  
  if (elements.nextButton) {
    elements.nextButton.disabled = false; // Allow wrapping
  }
};

DivenginedasDashboard.prototype.syntaxHighlight = function(code) {
  return code
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(class|function|public|private|protected|static|const|var|let|async|await|return|if|else|foreach|for|while|try|catch|finally|use|namespace|extends|implements)/g, '<span class="keyword">$1</span>')
    .replace(/('([^'\\]|\\.)*'|"([^"\\]|\\.)*")/g, '<span class="string">$1</span>')
    .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="comment">$1</span>')
    .replace(/\b([A-Z][a-zA-Z0-9_]*)\s*\(/g, '<span class="function">$1</span>(')
    .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="variable">$$1</span>');
};
