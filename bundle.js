const fs = require('fs');
const path = require('path');

// Configuration: specify directory and file types to look for
const TARGET_DIR = './src'; 
const OUTPUT_FILE = './project_code.txt';
const ALLOWED_EXTENSIONS = ['.ts', '.json', '.prisma', '.md'];
const IGNORED_DIRS = ['node_modules', 'dist', '.git', 'nest-cli.json'];

// Clear old output if it exists
if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);

function buildTree(dir, prefix = '') {
  let structure = '';
  const files = fs.readdirSync(dir);
  
  files.forEach((file, index) => {
    const fullPath = path.join(dir, file);
    const isLast = index === files.length - 1;
    const marker = isLast ? '└── ' : '├── ';
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        structure += `${prefix}${marker}${file}/\n`;
        structure += buildTree(fullPath, prefix + (isLast ? '    ' : '│   '));
      }
    } else {
      if (ALLOWED_EXTENSIONS.includes(path.extname(file))) {
        structure += `${prefix}${marker}${file}\n`;
      }
    }
  });
  return structure;
}

function mergeContents(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) mergeContents(fullPath);
    } else if (ALLOWED_EXTENSIONS.includes(path.extname(file))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const relativePath = path.relative(process.cwd(), fullPath);
      
      // Append formatted markdown blocks for Claude
      fs.appendFileSync(OUTPUT_FILE, `\n\n========================================\n`);
      fs.appendFileSync(OUTPUT_FILE, `FILE: ${relativePath}\n`);
      fs.appendFileSync(OUTPUT_FILE, `========================================\n\`\`\`ts\n${content}\n\`\`\`\n`);
    }
  }
}

console.log('Scanning directory structure...');
const treeHeader = `========================================\nPROJECT DIRECTORY STRUCTURE\n========================================\nsrc/\n${buildTree(TARGET_DIR, ' ')}`;
fs.writeFileSync(OUTPUT_FILE, treeHeader);

console.log('Merging code files...');
mergeContents(TARGET_DIR);

console.log(`Success! Your entire project has been bundled into: ${OUTPUT_FILE}`);