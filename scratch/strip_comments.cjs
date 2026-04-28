const fs = require('fs');
const path = require('path');

function stripCommentsSafer(code) {
  let output = "";
  let i = 0;
  let inString = null;
  let inComment = null;
  while (i < code.length) {
    const char = code[i];
    const next = code[i+1];
    
    if (inComment === '//') {
      if (char === '\n') {
        inComment = null;
        output += char;
      }
    } else if (inComment === '/*') {
      if (char === '*' && next === '/') {
        inComment = null;
        i++;
      }
    } else if (inString) {
      output += char;
      if (char === inString && code[i-1] !== '\\') {
        inString = null;
      }
    } else {
      if (char === '/' && next === '/') {
        inComment = '//';
        i++;
      } else if (char === '/' && next === '*') {
        inComment = '/*';
        i++;
      } else if (char === "'" || char === '"' || char === '`') {
        inString = char;
        output += char;
      } else {
        output += char;
      }
    }
    i++;
  }
  return output;
}

const files = process.argv.slice(2);

files.forEach(file => {
  const filePath = path.resolve(file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = stripCommentsSafer(content);
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`Cleaned (Safer): ${file}`);
  }
});
