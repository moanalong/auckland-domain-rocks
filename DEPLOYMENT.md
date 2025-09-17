# Auckland Domain Rock Hunter - Deployment Guide

## Continuous Deployment Workflow

Your app is now set up for continuous deployment! Here's your complete workflow:

### Daily Development Workflow

1. **Make changes in Cursor/VS Code**
   - Edit any file (`index.html`, `app.js`, `styles.css`, etc.)
   - Save your changes

2. **Stage and commit changes**
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

3. **Push to GitHub**
   ```bash
   git push origin main
   ```

4. **Automatic deployment**
   - GitHub Pages automatically detects the push
   - Builds and deploys your site via GitHub Actions
   - Live site updates in 2-3 minutes

### Quick Commands Reference

```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub (triggers deployment)
git push origin main

# View commit history
git log --oneline

# Check remote repository
git remote -v
```

### Site Information

- **Live Site**: https://moanalong.github.io/auckland-domain-rocks/
- **GitHub Repo**: https://github.com/moanalong/auckland-domain-rocks
- **Local Development**: Open `index.html` in browser

### GitHub Pages Dashboard

Monitor deployments at: https://github.com/moanalong/auckland-domain-rocks/actions

- View build logs in Actions tab
- See deployment status
- Access settings via Settings > Pages

### Best Practices

1. **Commit frequently** with descriptive messages
2. **Test locally** before pushing (open `index.html` in browser)
3. **Use meaningful commit messages**:
   - ✅ "Add search functionality for rocks"
   - ❌ "fix stuff"

4. **Check GitHub Actions deploy status** after pushing
5. **Wait 1-2 minutes** for changes to appear on live site

### Troubleshooting

**If deployment fails:**
1. Check GitHub Actions logs in the Actions tab
2. Ensure all files are committed: `git status`
3. Check for JavaScript errors in browser console
4. Verify all image/file paths are correct

**If changes don't appear:**
1. Wait a few minutes (deployments take time)
2. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Check if deploy succeeded in GitHub Actions

### File Structure
```
auckland-rock-hunter/
├── index.html          # Main HTML file
├── app.js             # JavaScript functionality  
├── styles.css         # Styling
├── painted-rock.svg   # Rock icon
└── DEPLOYMENT.md      # This guide
```

Happy rock hunting! 🎨🪨