// Legacy script - disabled
/* (() => {
  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  };

  ready(() => {
    const animatedNodes = document.querySelectorAll('[data-animate]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.25,
      });

      animatedNodes.forEach((node) => observer.observe(node));
    } else {
      animatedNodes.forEach((node) => node.classList.add('is-visible'));
    }

    const yearTarget = document.getElementById('current-year');
    if (yearTarget) {
      yearTarget.textContent = String(new Date().getFullYear());
    }

    const explorer = document.querySelector('[data-explorer]');
    const toggleExplorerBtn = document.querySelector('[data-toggle-explorer]');
    const sidebarExplorerBtn = document.querySelector('.ide-sidebar [data-target="explorer"]');

    const toggleExplorer = () => {
      if (!explorer) {
        return;
      }
      const isVisible = explorer.classList.toggle('is-visible');
      if (toggleExplorerBtn) {
        toggleExplorerBtn.setAttribute('aria-expanded', String(isVisible));
      }
    };

    if (toggleExplorerBtn) {
      toggleExplorerBtn.addEventListener('click', toggleExplorer);
    }

    if (sidebarExplorerBtn) {
      sidebarExplorerBtn.addEventListener('click', toggleExplorer);
    }

    const tree = document.querySelector('[data-tree]');
    const tabsBar = document.querySelector('[data-tabs]');
    const panes = Array.from(document.querySelectorAll('[data-pane]'));

    const activatePane = (target) => {
      if (!target) {
        return;
      }
      panes.forEach((pane) => {
        pane.classList.toggle('is-active', pane.dataset.pane === target);
      });

      if (tree) {
        tree.querySelectorAll('.tree-item').forEach((item) => {
          if (item instanceof HTMLElement && item.dataset.target) {
            item.classList.toggle('is-active', item.dataset.target === target);
          }
        });
      }

      if (tabsBar) {
        tabsBar.querySelectorAll('.ide-tab').forEach((tab) => {
          if (tab instanceof HTMLElement && tab.dataset.target) {
            tab.classList.toggle('is-active', tab.dataset.target === target);
          }
        });
      }

      if (explorer && explorer.classList.contains('is-visible') && window.innerWidth <= 1100) {
        explorer.classList.remove('is-visible');
      }
    };

    if (tree) {
      tree.addEventListener('click', (event) => {
        const trigger = event.target;
        if (!(trigger instanceof HTMLElement)) {
          return;
        }
        const fileButton = trigger.closest('.tree-item');
        if (fileButton instanceof HTMLElement && fileButton.dataset.target) {
          event.preventDefault();
          activatePane(fileButton.dataset.target);
        }
      });
    }

    if (tabsBar) {
      tabsBar.addEventListener('click', (event) => {
        const trigger = event.target;
        if (!(trigger instanceof HTMLElement)) {
          return;
        }
        if (trigger.dataset.target) {
          activatePane(trigger.dataset.target);
        }
      });
    }

    const projectsGrid = document.querySelector('[data-projects]');
    const modalBackdrop = document.querySelector('[data-modal]');
    const modalBody = document.querySelector('[data-modal-body]');
    const modalTitle = document.getElementById('modal-title');
    const closeModalButton = document.querySelector('[data-close-modal]');
    const readmeCache = new Map();

    const toggleModal = (show) => {
      if (!modalBackdrop) {
        return;
      }
      if (show) {
        modalBackdrop.hidden = false;
        document.body.classList.add('modal-open');
      } else {
        modalBackdrop.hidden = true;
        document.body.classList.remove('modal-open');
      }
    };

    const closeModal = () => {
      toggleModal(false);
      if (modalBody) {
        modalBody.innerHTML = '<div class="modal-placeholder">Loading README...</div>';
      }
    };

    if (closeModalButton && modalBackdrop) {
      closeModalButton.addEventListener('click', closeModal);
      modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) {
          closeModal();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalBackdrop.hidden) {
          closeModal();
        }
      });
    }

    const formatDate = (isoDate) => {
      if (!isoDate) {
        return 'Unknown update';
      }
      try {
        const formatter = new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return `Updated ${formatter.format(new Date(isoDate))}`;
      } catch (error) {
        return `Updated ${isoDate}`;
      }
    };

    const formatNumber = (value) => {
      try {
        return new Intl.NumberFormat().format(value || 0);
      } catch (error) {
        return String(value || 0);
      }
    };

    const projects = [
      { repo: 'div', friendlyName: 'divengine/div', fallback: 'Dynamic template engine for flexible, expressive user interfaces.' },
      { repo: 'ajaxmap', friendlyName: 'divengine/ajaxmap', fallback: 'Bridge PHP logic and JavaScript seamlessly to keep data in sync.' },
      { repo: 'nodes', friendlyName: 'divengine/nodes', fallback: 'PHP-first NoSQL database designed for flexible structures and fast retrieval.' },
      { repo: 'ways', friendlyName: 'divengine/ways', fallback: 'Dynamic backend routing for APIs and services.' },
      { repo: 'orm', friendlyName: 'divengine/orm', fallback: 'A pragmatic ORM keeping database control in your hands.' },
      { repo: 'functions', friendlyName: 'divengine/functions', fallback: 'Utility helpers for PHP projects ready for production.' },
      { repo: 'matrix', friendlyName: 'divengine/matrix', fallback: 'Matrix manipulation toolkit for PHP data transformations.' }
    ];

    const repoEndpoint = (slug) => `https://api.github.com/repos/divengine/${slug}`;
    const readmeEndpoint = (slug) => `https://api.github.com/repos/divengine/${slug}/readme`;

    const createProjectCard = (meta, project) => {
      const card = document.createElement('article');
      card.className = 'project-card';
      card.dataset.repo = project.repo;

      const name = meta?.full_name || project.friendlyName || project.repo;
      const description = meta?.description || project.fallback;
      const language = meta?.language || 'Multi-language';
      const updated = formatDate(meta?.pushed_at);
      const stars = formatNumber(meta?.stargazers_count || 0);
      const htmlUrl = meta?.html_url || repoEndpoint(project.repo);

      card.innerHTML = `
        <div class="project-card__header">
          <h3>${name}</h3>
          <span class="project-card__badge">${language}</span>
        </div>
        <p class="project-card__description">${description}</p>
        <div class="project-card__meta">
          <span>? ${stars}</span>
          <span>${updated}</span>
        </div>
        <div class="project-card__actions">
          <a class="button outline" href="${htmlUrl}" target="_blank" rel="noopener">Open repository</a>
          <button class="button ghost" type="button" data-action="readme" data-repo="${project.repo}">View README</button>
        </div>
      `;

      return card;
    };

    const createErrorCard = (project, error) => {
      const card = document.createElement('article');
      card.className = 'project-card';
      card.dataset.repo = project.repo;
      card.innerHTML = `
        <div class="project-card__header">
          <h3>${project.friendlyName || project.repo}</h3>
          <span class="project-card__badge">Unavailable</span>
        </div>
        <p class="project-card__description">${project.fallback}</p>
        <div class="project-card__meta">
          <span>${error?.message || 'Unable to load repository metadata'}</span>
        </div>
        <div class="project-card__actions">
          <a class="button outline" href="https://github.com/divengine/${project.repo}" target="_blank" rel="noopener">Open repository</a>
        </div>
      `;
      return card;
    };

    const renderProjects = async () => {
      if (!projectsGrid) {
        return;
      }
      projectsGrid.innerHTML = '<div class="skeleton-note">Loading repositories from GitHub...</div>';
      const fragment = document.createDocumentFragment();

      for (const project of projects) {
        try {
          const response = await fetch(repoEndpoint(project.repo));
          if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}`);
          }
          const meta = await response.json();
          fragment.appendChild(createProjectCard(meta, project));
        } catch (error) {
          fragment.appendChild(createErrorCard(project, error));
        }
      }

      projectsGrid.innerHTML = '';
      projectsGrid.appendChild(fragment);
    };

    const loadReadme = async (repo) => {
      if (readmeCache.has(repo)) {
        return readmeCache.get(repo);
      }
      const response = await fetch(readmeEndpoint(repo), {
        headers: {
          Accept: 'application/vnd.github.v3.html',
        },
      });
      if (!response.ok) {
        throw new Error(`Unable to load README (status ${response.status})`);
      }
      const html = await response.text();
      readmeCache.set(repo, html);
      return html;
    };

    const handleProjectInteraction = (event) => {
      const trigger = event.target;
      if (!(trigger instanceof HTMLElement)) {
        return;
      }
      if (trigger.dataset.action === 'readme' && trigger.dataset.repo) {
        const repo = trigger.dataset.repo;
        toggleModal(true);
        if (modalTitle) {
          modalTitle.textContent = `${repo} README`;
        }
        if (modalBody) {
          modalBody.innerHTML = '<div class="modal-placeholder">Loading README...</div>';
        }
        loadReadme(repo)
          .then((html) => {
            if (modalBody) {
              modalBody.innerHTML = html;
            }
          })
          .catch((error) => {
            if (modalBody) {
              modalBody.innerHTML = `<p class="modal-placeholder">${error.message || 'Unable to load README at this time.'}</p>`;
            }
          });
      }
    };

    if (projectsGrid) {
      renderProjects();
      projectsGrid.addEventListener('click', handleProjectInteraction);
    }
  });
})(); */
