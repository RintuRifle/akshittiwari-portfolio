
const SUPABASE_URL = 'https://koggdnslelupnbypesql.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Kwm7KP_WSq9QLieiUfWqaA_B3lZ6Gic';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ghUsername = "RintuRifle";

function getTechIcon(techName) {
    const name = techName.toLowerCase();
    if (name.includes('react')) return { icon: 'fab fa-react', color: '#61dafb' };
    if (name.includes('next')) return { isNext: true };
    if (name.includes('tailwind')) return { icon: 'fas fa-wind', color: '#38bdf8' };
    if (name.includes('typescript') || name.includes('ts')) return { isTS: true };
    if (name.includes('node') || name.includes('express')) return { icon: 'fab fa-node-js', color: '#68a063' };
    if (name.includes('supabase')) return { icon: 'fas fa-bolt', color: '#3ecf8e' };
    if (name.includes('javascript') || name.includes('js')) return { icon: 'fab fa-js', color: '#f7df1e' };
    if (name.includes('python')) return { icon: 'fab fa-python', color: '#3776ab' };
    if (name.includes('html')) return { icon: 'fab fa-html5', color: '#e34f26' };
    if (name.includes('css')) return { icon: 'fab fa-css3-alt', color: '#1572b6' };
    if (name.includes('java') && !name.includes('script')) return { icon: 'fab fa-java', color: '#007396' };
    if (name.includes('c++') || name.includes('cpp')) return { icon: 'fas fa-code', color: '#00599c' };
    return { icon: 'fas fa-code', color: '#666' };
}

function renderTechStack(techArray) {
    if (!techArray || techArray.length === 0) return '';
    
    return techArray.slice(0, 4).map(tech => {
        const t = getTechIcon(tech);
        if (t.isNext) {
            return `<span class="tech-pill"><span style="background: var(--text-primary); color: var(--bg-color); width: 12px; height: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; border-radius: 50%; line-height: 1; margin-right: 4px;">N</span> Next.js</span>`;
        }
        if (t.isTS) {
            return `<span class="tech-pill"><span style="background: #3178c6; color: white; width: 12px; height: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 7px; font-weight: bold; border-radius: 2px; line-height: 1; margin-right: 4px;">TS</span> TypeScript</span>`;
        }
        return `<span class="tech-pill"><i class="${t.icon}" style="color:${t.color};"></i> ${tech}</span>`;
    }).join('');
}

async function loadProjects() {
    const grid = document.getElementById("all-projects-grid");
    if (!grid) return;

    try {
        // 1. Fetch from GitHub
        let ghRepos = [];
        try {
            const reposRes = await fetch(`https://api.github.com/users/${ghUsername}/repos?per_page=100&sort=pushed`);
            if (reposRes.ok) ghRepos = await reposRes.json();
        } catch (e) {
            console.warn('Failed to fetch GitHub repos', e);
        }

        // 2. Fetch from Supabase
        let sbProjects = [];
        const { data: projects, error } = await supabaseClient
            .from('projects')
            .select('*');
        if (!error && projects) sbProjects = projects;

        // 3. Merge
        const mergedProjectsMap = new Map();

        // Add GitHub repos first
        ghRepos.forEach(repo => {
            if (repo.fork) return;
            
            // Extract languages automatically
            const detected = [];
            const name = repo.name.toLowerCase();
            const desc = (repo.description || '').toLowerCase();
            if (name.includes('react') || desc.includes('react')) detected.push('React');
            if (name.includes('next') || desc.includes('next')) detected.push('Next.js');
            if (name.includes('tailwind') || desc.includes('tailwind')) detected.push('Tailwind');
            if (name.includes('typescript') || name.includes('ts-') || desc.includes('typescript')) detected.push('TypeScript');
            if (name.includes('node') || desc.includes('node') || desc.includes('express')) detected.push('Node.js');
            if (repo.language && !detected.includes(repo.language)) detected.push(repo.language);

            mergedProjectsMap.set(repo.html_url.toLowerCase(), {
                title: repo.name,
                description: repo.description,
                github_url: repo.html_url,
                demo_url: repo.homepage || null,
                tech_stack: detected,
                cover_image: `https://opengraph.githubassets.com/1/${ghUsername}/${repo.name}`,
                is_completed: false, // Default if not in Supabase
                display_order: 999, // Default to end
                stars: repo.stargazers_count,
                pushed_at: new Date(repo.pushed_at).getTime()
            });
        });

        // Overlay Supabase overrides
        sbProjects.forEach(sb => {
            const key = (sb.github_url || '').toLowerCase();
            if (key && mergedProjectsMap.has(key)) {
                // Update existing
                const existing = mergedProjectsMap.get(key);
                if (sb.title) existing.title = sb.title;
                if (sb.description) existing.description = sb.description;
                if (sb.demo_url) existing.demo_url = sb.demo_url;
                if (sb.tech_stack && sb.tech_stack.length > 0) existing.tech_stack = sb.tech_stack;
                if (sb.cover_image) existing.cover_image = sb.cover_image;
                existing.is_completed = sb.is_completed;
                existing.display_order = sb.display_order;
                existing.from_supabase = true;
            } else {
                // Add entirely new manual project from Supabase
                mergedProjectsMap.set(`sb_${sb.id}`, {
                    title: sb.title,
                    description: sb.description,
                    github_url: sb.github_url,
                    demo_url: sb.demo_url,
                    tech_stack: sb.tech_stack || [],
                    cover_image: sb.cover_image,
                    is_completed: sb.is_completed,
                    display_order: sb.display_order || 0,
                    stars: 0,
                    pushed_at: new Date(sb.created_at).getTime(),
                    from_supabase: true
                });
            }
        });

        // Convert back to array and sort
        const finalProjects = Array.from(mergedProjectsMap.values()).sort((a, b) => {
            if (a.display_order !== b.display_order) return a.display_order - b.display_order;
            if (b.stars !== a.stars) return b.stars - a.stars;
            return b.pushed_at - a.pushed_at;
        });

        if (finalProjects.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">No projects available yet.</p>';
            return;
        }

        grid.innerHTML = ''; 

        finalProjects.forEach(repo => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const previewImg = repo.cover_image || '';

            let linksHtml = '';
            if (repo.stars > 0) linksHtml += `<span style="color:var(--accent); font-size: 0.9rem; margin-right: auto; display:flex; align-items:center; gap:4px;" title="GitHub Stars"><i class="fas fa-star"></i> ${repo.stars}</span>`;
            if (repo.github_url) linksHtml += `<a href="${repo.github_url}" target="_blank"><i class="fab fa-github"></i></a>`;
            if (repo.demo_url) linksHtml += `<a href="${repo.demo_url}" target="_blank"><i class="fas fa-external-link-alt"></i></a>`;

            const statusClass = repo.is_completed ? 'status-dot' : 'status-dot dev';
            const statusText = repo.is_completed ? 'Completed' : 'Under Development';
            const statusStyle = repo.is_completed ? '' : 'background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);';

            card.innerHTML = `
                <div class="project-image" style="padding: 0; background: var(--border-light);">
                    ${previewImg ? `<img 
                        src="${previewImg}" 
                        alt="${repo.title} preview"
                        style="width:100%;height:100%;object-fit:cover;display:block;border-radius:0;"
                        onerror="this.style.display='none'; this.parentElement.querySelector('.gh-fallback-icon').style.display='flex';"
                    >` : ''}
                    <div class="gh-fallback-icon" style="display:${previewImg ? 'none' : 'flex'}; position:absolute; inset:0; align-items:center; justify-content:center;">
                        <i class="fas fa-code" style="font-size:3rem; color:rgba(0,0,0,0.1); z-index:1;"></i>
                    </div>
                </div>
                <div class="project-content">
                    <div class="project-header">
                        <a href="${repo.demo_url || repo.github_url || '#'}" target="_blank" class="project-title">${repo.title}</a>
                        <div class="project-links">
                            ${linksHtml}
                        </div>
                    </div>
                    <p class="project-desc">${repo.description || 'A software project developed by Akshit Kumar Tiwari.'}</p>
                    
                    <span class="tech-stack-label">TECHSTACKS</span>
                    <div class="tech-stack">
                        ${renderTechStack(repo.tech_stack)}
                    </div>

                    <div class="project-footer">
                        <div class="status">
                            <span class="${statusClass}" style="${statusStyle}"></span> ${statusText}
                        </div>
                        <a href="${repo.demo_url || repo.github_url || '#'}" target="_blank" class="view-details">View Details <i class="fas fa-chevron-right" style="font-size:0.7rem"></i></a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Projects fetch error:", error);
        if (grid) {
            grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">Unable to load projects.</p>';
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadProjects();

    // Theme toggle logic (similar to index.js)
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
        const themeIcon = themeBtn.querySelector('i');
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
        themeBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
            }
        });
    }
});

// Reuse the background canvas system
(function initBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, animFrame, scene = {};
    let currentMode = localStorage.getItem('bgMode') || 'constellation';

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    function lc(alpha) {
        return isDark() ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    }

    // A simplified constellation bg just for the projects page
    function initConstellation() {
        scene = {
            stars: Array.from({ length: 60 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
                r: Math.random() * 1.5 + 0.5
            }))
        };
    }
    function drawConstellation() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = lc(isDark() ? 0.8 : 0.6);
        ctx.strokeStyle = lc(isDark() ? 0.1 : 0.1);
        ctx.lineWidth = 0.5;

        for (let i = 0; i < scene.stars.length; i++) {
            const p1 = scene.stars[i];
            p1.x += p1.vx; p1.y += p1.vy;
            if (p1.x < 0 || p1.x > W) p1.vx *= -1;
            if (p1.y < 0 || p1.y > H) p1.vy *= -1;

            ctx.beginPath();
            ctx.arc(p1.x, p1.y, p1.r, 0, Math.PI * 2);
            ctx.fill();

            for (let j = i + 1; j < scene.stars.length; j++) {
                const p2 = scene.stars[j];
                const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (d < 120) {
                    ctx.globalAlpha = 1 - d / 120;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    function loop() {
        drawConstellation();
        animFrame = requestAnimationFrame(loop);
    }

    function resize() {
        cancelAnimationFrame(animFrame);
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        initConstellation();
        loop();
    }

    window.addEventListener('resize', resize);
    resize();
})();
