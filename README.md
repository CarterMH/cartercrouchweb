# Carter Crouch - Personal Portfolio

A professional, sleek portfolio website showcasing my professional journey and experience in aviation operations and beyond.

## Features

- ✨ Modern, sleek design with heavy visual effects
- 🎨 Glassmorphism UI elements
- 🌈 Animated gradient backgrounds
- 📱 Fully responsive design
- ⚡ Smooth scroll animations
- 🎯 Parallax effects
- 💫 Interactive hover effects
- 🚀 Optimized for GitHub Pages

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with animations
- **JavaScript** - Interactive effects and animations
- **GitHub Pages** - Static hosting

## Deployment to GitHub Pages

### Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g., `cartercrouchweb`)
2. Clone the repository to your local machine
3. Copy all files to the repository folder
4. Commit and push:

```bash
git init
git add .
git commit -m "Initial commit: Portfolio website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cartercrouchweb.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings**
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch and **/ (root)** folder
6. Click **Save**
7. Your site will be live at: `https://YOUR_USERNAME.github.io/cartercrouchweb/`

### Alternative: Using GitHub Actions (Optional)

You can also create a `.github/workflows/deploy.yml` file for automatic deployment:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

## Local Development

To view the website locally:

1. Clone the repository
2. Open `index.html` in your web browser
3. Or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000` in your browser.

## Customization

### Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --accent-color: #ec4899;
    /* ... */
}
```

### Content

- Edit `index.html` to update your personal information
- Modify sections as needed
- Update work experience in the timeline section

### Contact Form

The contact form currently shows an alert on submission. To make it functional:

1. Use a form service like Formspree, Netlify Forms, or similar
2. Update the form action in `index.html`
3. Modify the form handler in `script.js`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available under the MIT License.

## Contact

For questions or inquiries, please reach out through the contact form on the website.

---

Built with ❤️ by Carter Crouch
